'use client'
import { useEffect } from 'react'
import { useFCM } from '@/lib/useFCM'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

function FCMInitializer() {
  const { permission, requestPermission } = useFCM()
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) return
      if (permission === 'default') {
        setTimeout(() => requestPermission(), 8000)
      }
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission])
  return null
}

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FCMInitializer />
      {children}
    </>
  )
}
