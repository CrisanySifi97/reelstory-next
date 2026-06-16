import { initializeApp, getApps } from 'firebase/app'
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth'
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const auth = getAuth(app)

// On the browser: use IndexedDB persistence so repeat visits load data instantly
// from local cache (no network round-trip) and sync in the background.
// On the server (SSR/pre-render): fall back to the default in-memory Firestore.
export const db = typeof window !== 'undefined'
  ? initializeFirestore(app, { localCache: persistentLocalCache() })
  : getFirestore(app)

// Ensure session persists across browser restarts (not just the tab)
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(() => {})
}
