'use client'
import { useEffect } from 'react'
import { db } from '@/lib/firebase'
import { doc, setDoc, increment } from 'firebase/firestore'

// Conta 1 visita por sessão de browser (não a cada navegação interna),
// guardada como total + contador diário, lida pelo admin em "Visitas".
export default function VisitTracker() {
  useEffect(() => {
    if (sessionStorage.getItem('rs_visit_counted')) return
    sessionStorage.setItem('rs_visit_counted', '1')

    const today = new Date().toISOString().split('T')[0]
    setDoc(doc(db, 'analytics', 'visits'), { total: increment(1) }, { merge: true }).catch(() => {})
    setDoc(doc(db, 'analytics', 'visits', 'daily', today), { count: increment(1) }, { merge: true }).catch(() => {})
  }, [])

  return null
}
