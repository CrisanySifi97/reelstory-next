'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Coins, Play, Loader2 } from 'lucide-react'
import { auth, db } from '@/lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function KursinhaSuccessPage() {
  const [coins, setCoins]       = useState<number | null>(null)
  const [prevCoins, setPrev]    = useState<number | null>(null)
  const [credited, setCredited] = useState(false)
  const [waiting, setWaiting]   = useState(true)

  useEffect(() => {
    let unsubSnap: (() => void) | null = null

    const unsubAuth = onAuthStateChanged(auth, user => {
      if (!user) return

      // Real-time listener — updates as soon as webhook credits the coins
      unsubSnap = onSnapshot(doc(db, 'users', user.uid), snap => {
        if (!snap.exists()) return
        const newCoins = snap.data().coins ?? 0

        setCoins(newCoins)
        setWaiting(false)

        // Detect the moment coins increased (webhook processed)
        setPrev(prev => {
          if (prev !== null && newCoins > prev) setCredited(true)
          return prev ?? newCoins  // first read — store as baseline
        })
      })
    })

    // Stop waiting after 15s even if webhook hasn't fired yet
    const timeout = setTimeout(() => setWaiting(false), 15000)

    return () => {
      unsubAuth()
      unsubSnap?.()
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div style={{
      background: 'var(--rs-bg-warm)', minHeight: '100dvh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', textAlign: 'center', fontFamily: 'var(--rs-font-body)', color: '#fff',
    }}>
      {/* Icon */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(34,197,94,.15)', border: '2px solid rgba(34,197,94,.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
      }}>
        <CheckCircle size={40} color="#22c55e" />
      </div>

      <h1 style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: 'var(--rs-display-sm)', marginBottom: '.5rem' }}>
        Pagamento confirmado!
      </h1>
      <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 'var(--rs-body-md)', marginBottom: '1.5rem', maxWidth: 360 }}>
        Os teus pontos foram creditados automaticamente. Podes começar a assistir agora mesmo.
      </p>

      {/* Coins display */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '.6rem',
        background: 'rgba(255,217,61,.1)', border: '1px solid rgba(255,217,61,.3)',
        borderRadius: 50, padding: '.6rem 1.5rem', marginBottom: '2rem',
        minWidth: 180, justifyContent: 'center',
      }}>
        {waiting && coins === null ? (
          <>
            <Loader2 size={18} color="var(--rs-accent)" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--rs-accent)', fontWeight: 700, fontSize: '1rem' }}>
              A aguardar confirmação...
            </span>
          </>
        ) : (
          <>
            <Coins size={20} color="var(--rs-accent)" />
            <span style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.4rem', color: 'var(--rs-accent)' }}>
              {(coins ?? 0).toLocaleString('pt-AO')} pts
            </span>
            {credited && (
              <span style={{ fontSize: '.75rem', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,.15)', border: '1px solid rgba(34,197,94,.35)', borderRadius: 50, padding: '.15rem .55rem' }}>
                ✓ creditado
              </span>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/explorar" style={{
          display: 'inline-flex', alignItems: 'center', gap: '.5rem',
          background: 'var(--rs-grad-hero)', color: '#fff',
          padding: '.75rem 1.8rem', borderRadius: 10, fontWeight: 700,
          fontSize: 'var(--rs-body-md)', textDecoration: 'none',
          boxShadow: 'var(--rs-shadow-btn)',
        }}>
          <Play size={16} fill="#fff" /> Explorar Séries
        </Link>
        <Link href="/pontos" style={{
          display: 'inline-flex', alignItems: 'center', gap: '.5rem',
          background: 'rgba(255,255,255,.06)', color: '#fff',
          border: '1px solid rgba(255,255,255,.12)',
          padding: '.75rem 1.8rem', borderRadius: 10, fontWeight: 700,
          fontSize: 'var(--rs-body-md)', textDecoration: 'none',
        }}>
          <Coins size={16} /> Ver Pontos
        </Link>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
