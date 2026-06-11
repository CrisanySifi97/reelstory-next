'use client'
import { useEffect } from 'react'
import Link from 'next/link'

export default function ConsumerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ReelStory Error]', error.message, error.stack)
  }, [error])

  return (
    <div style={{
      background: 'var(--rs-bg-warm)', minHeight: '100dvh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', textAlign: 'center', fontFamily: 'var(--rs-font-body)', color: '#fff',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
      <h1 style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.6rem', marginBottom: '.5rem' }}>
        Algo correu mal
      </h1>
      <p style={{ color: '#8892A4', fontSize: '.92rem', marginBottom: '1.5rem', maxWidth: 360 }}>
        {error.message || 'Erro inesperado ao carregar a página.'}
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={reset} style={{ background: 'var(--rs-grad-hero)', color: '#fff', border: 'none', padding: '.75rem 1.8rem', borderRadius: 10, fontWeight: 700, fontSize: '.9rem', cursor: 'pointer' }}>
          Tentar de novo
        </button>
        <Link href="/inicio" style={{ background: 'rgba(255,255,255,.06)', color: '#fff', border: '1px solid rgba(255,255,255,.12)', padding: '.75rem 1.8rem', borderRadius: 10, fontWeight: 700, fontSize: '.9rem', textDecoration: 'none' }}>
          Ir para o Início
        </Link>
      </div>
      {error.digest && (
        <p style={{ color: '#555', fontSize: '.72rem', marginTop: '1.5rem' }}>
          Código: {error.digest}
        </p>
      )}
    </div>
  )
}
