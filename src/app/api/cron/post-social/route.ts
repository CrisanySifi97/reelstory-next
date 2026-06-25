import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebaseAdmin'

const FB_API = 'https://graph.facebook.com/v21.0'

async function fbPost(path: string, body: Record<string, unknown>, token: string) {
  const res = await fetch(`${FB_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

async function refreshTikTokToken(db: admin.firestore.Firestore) {
  const ref = await db.collection('config').doc('tiktok').get()
  const tt = ref.data()
  if (!tt?.refresh_token) return { skipped: true }

  const body = new URLSearchParams({
    client_key:    process.env.TT_CLIENT_KEY!,
    client_secret: process.env.TT_CLIENT_SECRET!,
    grant_type:    'refresh_token',
    refresh_token: tt.refresh_token,
  })

  const res  = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = await res.json()
  if (data.error) {
    console.error('[refreshTikTokToken] TikTok API error', data.error)
    return { error: data.error.message ?? data.error }
  }

  await db.collection('config').doc('tiktok').set({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    open_id: data.open_id,
    updated_at: new Date().toISOString(),
  }, { merge: true })

  return { success: true }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = admin.firestore()
  const igId    = process.env.META_IG_BUSINESS_ID!
  const igToken = process.env.META_FB_USER_TOKEN!

  const tiktokRefresh = await refreshTikTokToken(db).catch(e => {
    console.error('[post-social] erro ao renovar token TikTok', e)
    return { error: (e as Error).message }
  })

  const snap = await db.collection('socialQueue')
    .where('posted.instagram', '==', false)
    .limit(1)
    .get()

  if (snap.empty) {
    return NextResponse.json({ skipped: true, reason: 'fila vazia', tiktokRefresh })
  }

  const doc  = snap.docs[0]
  const item = doc.data()

  try {
    const container = await fbPost(`/${igId}/media`, {
      caption: item.caption,
      image_url: item.image_url,
    }, igToken)

    const result = await fbPost(`/${igId}/media_publish`, { creation_id: container.id }, igToken)

    await doc.ref.update({
      'posted.instagram': true,
      'posted.instagram_at': new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      series: item.series_title,
      script: item.script_type,
      post_id: result.id,
      tiktokRefresh,
    })
  } catch (e) {
    return NextResponse.json({
      success: false,
      series: item.series_title,
      error: (e as Error).message,
      tiktokRefresh,
    }, { status: 500 })
  }
}
