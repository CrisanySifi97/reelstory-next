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

async function waitForVideoReady(containerId: string, token: string, maxWait = 110000) {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    const res  = await fetch(`${FB_API}/${containerId}?fields=status_code,status&access_token=${token}`)
    const data = await res.json()
    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') throw new Error(`Erro a processar vídeo: ${data.status}`)
    await new Promise(r => setTimeout(r, 5000))
  }
  throw new Error('Timeout a aguardar processamento do vídeo')
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = admin.firestore()
  const igId    = process.env.META_IG_BUSINESS_ID!
  const igToken = process.env.META_FB_USER_TOKEN!

  const snap = await db.collection('socialQueue')
    .where('posted.instagram_video', '==', false)
    .limit(5)
    .get()

  const doc = snap.docs.find(d => d.data().video_url)
  if (!doc) {
    return NextResponse.json({ skipped: true, reason: 'fila vazia ou sem vídeos' })
  }

  const item = doc.data()

  try {
    const container = await fbPost(`/${igId}/media`, {
      caption: item.caption,
      media_type: 'REELS',
      video_url: item.video_url,
    }, igToken)

    await waitForVideoReady(container.id, igToken)

    const result = await fbPost(`/${igId}/media_publish`, { creation_id: container.id }, igToken)

    await doc.ref.update({
      'posted.instagram_video': true,
      'posted.instagram_video_at': new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      series: item.series_title,
      script: item.script_type,
      post_id: result.id,
    })
  } catch (e) {
    return NextResponse.json({
      success: false,
      series: item.series_title,
      error: (e as Error).message,
    }, { status: 500 })
  }
}
