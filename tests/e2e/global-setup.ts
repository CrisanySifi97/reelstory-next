import { db, adminAuth } from './admin'
import { QA_EMAIL, QA_PASSWORD } from './helpers'

export default async function globalSetup() {
  let user
  try {
    user = await adminAuth.getUserByEmail(QA_EMAIL)
  } catch {
    user = await adminAuth.createUser({ email: QA_EMAIL, password: QA_PASSWORD })
  }
  // Generous coins so unlock-dependent tests never run dry; isAdmin stays false.
  await db.collection('users').doc(user.uid).set(
    { coins: 100000, isAdmin: false, name: 'QA Smoke' },
    { merge: true }
  )
}
