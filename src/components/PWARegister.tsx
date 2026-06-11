'use client'
import { useEffect, useState } from 'react'

type Banner = 'install' | null

// Module-level flag — survives StrictMode double-invoke, resets on real page load
let swRefreshing = false

export default function PWARegister() {
  const [banner, setBanner]         = useState<Banner>(null)
  const [installEvt, setInstallEvt] = useState<any>(null)
  const [isPWA, setIsPWA]           = useState(false)
  const [isIOS, setIsIOS]           = useState(false)
  const [dismissed, setDismissed]   = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsPWA(standalone)

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    if (!('serviceWorker' in navigator)) return

    // Register ONLY the main SW — FCM SW is registered by useFCM when needed
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing
        newSW?.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            newSW.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    }).catch(() => {})

    // Named handler so we can remove it on cleanup
    const onControllerChange = () => {
      if (!swRefreshing) { swRefreshing = true; window.location.reload() }
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    // Android install prompt
    const onInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvt(e)
      if (!standalone && !sessionStorage.getItem('pwa-dismissed')) {
        setTimeout(() => setBanner('install'), 4000)
      }
    }
    window.addEventListener('beforeinstallprompt', onInstallPrompt as any)
    window.addEventListener('appinstalled', () => { setBanner(null); setIsPWA(true) })

    // iOS install hint
    if (ios && !standalone && !sessionStorage.getItem('pwa-dismissed')) {
      setTimeout(() => setBanner('install'), 5000)
    }

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      window.removeEventListener('beforeinstallprompt', onInstallPrompt as any)
    }
  }, [])

  const handleInstall = async () => {
    if (installEvt) {
      installEvt.prompt()
      const { outcome } = await installEvt.userChoice
      if (outcome === 'accepted') setIsPWA(true)
    }
    setBanner(null)
  }

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-dismissed', '1')
    setBanner(null)
    setDismissed(true)
  }

  if (banner !== 'install' || dismissed) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: `calc(${isPWA ? '0px' : '70px'} + env(safe-area-inset-bottom, 0px) + .75rem)`,
      left: '.75rem', right: '.75rem', zIndex: 9000,
      background: 'rgba(26,26,46,.98)',
      border: '1px solid rgba(255,56,92,.35)',
      borderRadius: 18, padding: '1rem 1.1rem',
      boxShadow: '0 -4px 40px rgba(0,0,0,.5), 0 8px 40px rgba(0,0,0,.5)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      animation: 'rs-slide-up .35s cubic-bezier(.4,0,.2,1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.9rem', marginBottom: isIOS ? '.8rem' : 0 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#FF385C,#D50032)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: '1.1rem', color: '#fff', flexShrink: 0, boxShadow: '0 4px 12px rgba(255,56,92,.4)' }}>
          RS
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '.92rem', fontWeight: 700, color: '#fff', marginBottom: 2 }}>Instalar ReelStory</div>
          <div style={{ fontSize: '.74rem', color: '#8892A4', lineHeight: 1.3 }}>
            Acesso rápido · Funciona offline · Sem browser
          </div>
        </div>
        <button onClick={handleDismiss} style={{ background: 'rgba(255,255,255,.06)', border: 'none', color: '#8892A4', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          ✕
        </button>
      </div>

      {isIOS && !installEvt && (
        <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 10, padding: '.75rem', fontSize: '.78rem', color: '#B8B8B8', lineHeight: 1.6 }}>
          <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>Como instalar no iPhone/iPad:</div>
          <div>1. Toca em <strong style={{ color: 'var(--rs-accent)' }}>Partilhar</strong> <span>⎙</span> no Safari</div>
          <div>2. Selecciona <strong style={{ color: 'var(--rs-accent)' }}>"Adicionar ao ecrã inicial"</strong></div>
          <div>3. Toca em <strong style={{ color: 'var(--rs-accent)' }}>Adicionar</strong></div>
        </div>
      )}

      {!isIOS && installEvt && (
        <div style={{ display: 'flex', gap: 8, marginTop: 0 }}>
          <button onClick={handleInstall} style={{ flex: 1, background: 'linear-gradient(135deg,#FF385C,#D50032)', border: 'none', color: '#fff', borderRadius: 10, padding: '.65rem', fontSize: '.88rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,56,92,.4)' }}>
            ↓ Instalar agora
          </button>
          <button onClick={handleDismiss} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#8892A4', borderRadius: 10, padding: '.65rem 1rem', fontSize: '.82rem', cursor: 'pointer' }}>
            Depois
          </button>
        </div>
      )}
    </div>
  )
}
