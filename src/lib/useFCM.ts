'use client'
import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? ''

export function useFCM() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [token, setToken]           = useState('')
  const [error, setError]           = useState('')

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined' || !('Notification' in window)) return
    setPermission(Notification.permission)
  }, [])

  const requestPermission = async (): Promise<boolean> => {
    try {
      if (!('Notification' in window)) { setError('Browser não suporta notificações'); return false }
      if (!VAPID_KEY) { setError('VAPID key não configurada'); return false }

      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return false

      // Dynamically import firebase/messaging to avoid SSR issues
      const { getMessaging, getToken } = await import('firebase/messaging')
      const { initializeApp, getApps } = await import('firebase/app')

      const app = getApps()[0]
      const messaging = getMessaging(app)

      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
      })

      setToken(fcmToken)

      // Save to Firestore
      const user = auth.currentUser
      if (user && fcmToken) {
        await updateDoc(doc(db, 'users', user.uid), { fcmToken }).catch(err => console.error('[useFCM] erro ao guardar token', err))
      }

      return true
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao activar notificações')
      return false
    }
  }

  // Auto-request when user logs in (if already granted)
  useEffect(() => {
    if (typeof window === 'undefined' || !VAPID_KEY) return
    const unsub = onAuthStateChanged(auth, user => {
      if (user && Notification.permission === 'granted') {
        requestPermission().catch(() => {})
      }
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { permission, token, error, requestPermission }
}
