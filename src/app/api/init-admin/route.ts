import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebaseAdmin'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * Sets isAdmin:true for the first admin user.
 * The email is compared server-side against ADMIN_EMAIL (no NEXT_PUBLIC_ prefix —
 * never exposed to the browser). Any authenticated Firebase user can call this;
 * only the one whose email matches ADMIN_EMAIL will be granted the flag.
 */
export async function POST(req: NextRequest) {
  if (!admin.apps.length) {
    return NextResponse.json({ error: 'Admin SDK não configurado' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const match = authHeader.match(/^Bearer (.+)$/)
  if (!match) return NextResponse.json({ error: 'Token em falta' }, { status: 401 })

  try {
    const decoded = await admin.auth().verifyIdToken(match[1])
    const adminEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()

    if (!adminEmail || decoded.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }

    const db = getFirestore()
    const userRef = db.collection('users').doc(decoded.uid)
    const snap = await userRef.get()

    if (snap.exists && snap.data()?.isAdmin === true) {
      return NextResponse.json({ ok: true, alreadySet: true })
    }

    // Admin SDK bypasses Firestore client rules — safe to set isAdmin here
    await userRef.set({ isAdmin: true }, { merge: true })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erro interno' }, { status: 500 })
  }
}
