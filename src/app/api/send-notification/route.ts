import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebaseAdmin'
import { getFirestore } from 'firebase-admin/firestore'
import { verifyAdmin } from '@/lib/verifyAdmin'

export async function POST(req: NextRequest) {
  try {
    // Verify admin is initialised
    if (!admin.apps.length) {
      return NextResponse.json(
        { error: 'Firebase Admin não configurado. Adiciona as variáveis FIREBASE_ADMIN_* no Vercel.' },
        { status: 503 }
      )
    }

    if (!(await verifyAdmin(req))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { title, body, url, tokens: manualTokens } = await req.json()
    if (!title || !body) {
      return NextResponse.json({ error: 'title e body são obrigatórios' }, { status: 400 })
    }

    const db = getFirestore()
    const messaging = admin.messaging()

    // Collect FCM tokens — either provided or from all users
    let tokens: string[] = manualTokens ?? []
    if (!tokens.length) {
      const snap = await db.collection('users').where('fcmToken', '!=', '').get()
      tokens = snap.docs
        .map(d => d.data().fcmToken as string)
        .filter(Boolean)
    }

    if (!tokens.length) {
      return NextResponse.json({ sent: 0, message: 'Nenhum token FCM registado ainda.' })
    }

    // Send in batches of 500 (FCM limit)
    const BATCH = 500
    let sent = 0, failed = 0
    const invalidTokens: string[] = []

    for (let i = 0; i < tokens.length; i += BATCH) {
      const batch = tokens.slice(i, i + BATCH)
      const res = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        webpush: {
          notification: {
            title, body,
            icon:  '/icon-192.png',
            badge: '/icon-192.png',
            ...(url && { data: { url } }),
          },
          fcmOptions: url ? { link: url } : undefined,
        },
        data: url ? { url } : {},
      })
      sent   += res.successCount
      failed += res.failureCount

      // Collect invalid tokens to clean up
      res.responses.forEach((r, idx) => {
        if (!r.success && (
          r.error?.code === 'messaging/invalid-registration-token' ||
          r.error?.code === 'messaging/registration-token-not-registered'
        )) {
          invalidTokens.push(batch[idx])
        }
      })
    }

    // Remove invalid tokens from Firestore (Firestore 'in' queries cap at 30 values)
    const IN_LIMIT = 30
    for (let i = 0; i < invalidTokens.length; i += IN_LIMIT) {
      const chunk = invalidTokens.slice(i, i + IN_LIMIT)
      const snap = await db.collection('users').where('fcmToken', 'in', chunk).get()
      if (snap.empty) continue
      const batch = db.batch()
      snap.docs.forEach(d => batch.update(d.ref, { fcmToken: '' }))
      await batch.commit()
    }

    return NextResponse.json({ sent, failed, total: tokens.length })
  } catch (e: any) {
    console.error('[send-notification]', e)
    return NextResponse.json({ error: e.message ?? 'Erro interno' }, { status: 500 })
  }
}
