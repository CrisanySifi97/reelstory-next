'use client'
import { useEffect } from 'react'
import { db } from '@/lib/firebase'
import { doc, setDoc, increment } from 'firebase/firestore'

// Conta 1 visita por sessão de browser (não a cada navegação interna),
// guardada como total + contador diário, lida pelo admin em "Visitas".
export default function VisitTracker() {
  useEffect(() => {
    if (sessionStorage.getItem('rs_visit_counted')) return

    const today = new Date().toISOString().split('T')[0]
    Promise.all([
      setDoc(doc(db, 'analytics', 'visits'), { total: increment(1) }, { merge: true }),
      setDoc(doc(db, 'analytics', 'visits', 'daily', today), { count: increment(1) }, { merge: true }),
    ])
      // Só marca como "contado" depois de confirmar que a escrita funcionou —
      // caso contrário uma falha (ex: regras do Firestore) nunca mais tentaria de novo nesta sessão.
      .then(() => sessionStorage.setItem('rs_visit_counted', '1'))
      .catch(err => console.error('[VisitTracker]', err))
  }, [])

  return null
}
