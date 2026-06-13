import { NextRequest } from 'next/server'
import admin from '@/lib/firebaseAdmin'
import { getFirestore } from 'firebase-admin/firestore'

/** Verifies the request's Firebase ID token belongs to an admin user. */
export async function verifyAdmin(req: NextRequest): Promise<boolean> {
  if (!admin.apps.length) return false

  const authHeader = req.headers.get('authorization') ?? ''
  const match = authHeader.match(/^Bearer (.+)$/)
  if (!match) return false

  try {
    const decoded = await admin.auth().verifyIdToken(match[1])
    const snap = await getFirestore().collection('users').doc(decoded.uid).get()
    return snap.exists && snap.data()?.isAdmin === true
  } catch {
    return false
  }
}
