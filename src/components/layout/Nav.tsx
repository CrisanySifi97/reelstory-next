'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, Bell, Coins, X } from 'lucide-react'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'

interface NavProps {
  transparent?: boolean
  activeLink?: string
}

export default function Nav({ transparent = false, activeLink }: NavProps) {
  const [solid, setSolid]       = useState(!transparent)
  const [coins, setCoins]       = useState<number | null>(null)
  const [initial, setInitial]   = useState('U')
  const [loggedIn, setLoggedIn] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [hover, setHover]       = useState<string | null>(null)
  const [hasNotif, setHasNotif] = useState(true)
  const [isPWA, setIsPWA]       = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)')
    setIsPWA(mq.matches)
    mq.addEventListener('change', e => setIsPWA(e.matches))
  }, [])

  useEffect(() => {
    if (!transparent) return
    const fn = () => setSolid(window.scrollY > 60)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [transparent])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setLoggedIn(!!user)
      if (!user) return
      setInitial((user.displayName || user.email || 'U')[0].toUpperCase())
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists()) setCoins(snap.data().coins ?? 0)
      } catch {}
    })
    return unsub
  }, [])

  const links = [
    { href: '/inicio',   label: 'Início'      },
    { href: '/explorar', label: 'Catálogo'    },
    { href: '/lista',    label: 'Minha Lista' },
    { href: '/pontos',   label: 'Pontos'      },
  ]

  return (
    <header className="rs-nav-pwa rs-nav" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 'calc(72px + env(safe-area-inset-top, 0px))',
      display: 'flex', alignItems: 'center', padding: '0 2rem',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      background: solid
        ? 'radial-gradient(ellipse 60% 120% at 50% -20%, rgba(255,56,92,.10) 0%, transparent 65%), linear-gradient(180deg, rgba(14,14,14,.72), rgba(14,14,14,.55))'
        : 'transparent',
      backdropFilter: solid ? 'blur(24px) saturate(160%)' : 'none',
      WebkitBackdropFilter: solid ? 'blur(24px) saturate(160%)' : 'none',
      borderBottom: solid ? '1px solid rgba(255,255,255,.05)' : 'none',
      transition: 'background .3s, border .3s, backdrop-filter .3s',
    }}>
      {/* Pink-to-gold hairline */}
      {solid && (
        <div style={{
          position: 'absolute', left: '8%', right: '8%', bottom: 0, height: 1,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,56,92,.5) 25%, rgba(255,217,61,.45) 75%, transparent 100%)',
          pointerEvents: 'none',
        }}/>
      )}

      {/* Logo */}
      <Link href="/inicio" style={{ display: 'inline-flex', alignItems: 'center', gap: '.45rem', textDecoration: 'none', flexShrink: 0 }}>
        <span className="nav-logo-text" style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-.01em', color: '#fff', filter: solid ? 'drop-shadow(0 0 18px rgba(255,56,92,.25))' : 'none' }}>
          Reel<span style={{ color: 'var(--rs-primary)' }}>Story</span>
        </span>
        <span className="nav-ao" style={{ fontSize: '.58rem', fontWeight: 800, color: 'var(--rs-accent)', background: 'rgba(255,217,61,.10)', border: '1px solid rgba(255,217,61,.25)', padding: '.18rem .4rem', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.8px', alignSelf: 'flex-start', marginTop: 4 }}>AO</span>
      </Link>

      {/* Desktop links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '1.8rem', marginLeft: '2.4rem' }} className="nav-desktop-links">
        {links.map(l => (
          <Link key={l.href} href={l.href}
            onMouseEnter={() => setHover(l.href)}
            onMouseLeave={() => setHover(null)}
            style={{
              textDecoration: 'none', color: (activeLink === l.href || hover === l.href) ? '#fff' : 'rgba(255,255,255,.65)',
              fontSize: '.88rem', fontWeight: 600, letterSpacing: '.2px', position: 'relative', padding: '4px 0',
              transition: 'color .2s',
            }}>
            {l.label}
            <span style={{
              position: 'absolute', left: 0, right: 0, bottom: -2, height: 2,
              background: 'var(--rs-primary)', borderRadius: 2,
              transform: (activeLink === l.href || hover === l.href) ? 'scaleX(1)' : 'scaleX(0)',
              transition: 'transform .25s ease', transformOrigin: 'left',
            }}/>
          </Link>
        ))}
      </nav>

      <div className="nav-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '.6rem' }}>
        {/* Expandable search — hidden on mobile (explorar has its own) */}
        <div className="nav-search" style={{
          display: 'flex', alignItems: 'center',
          background: searchOpen ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.04)',
          border: '1px solid ' + (searchOpen ? 'rgba(255,56,92,.45)' : 'rgba(255,255,255,.08)'),
          borderRadius: 50, width: searchOpen ? 220 : 34, height: 34,
          paddingLeft: searchOpen ? 12 : 0, paddingRight: searchOpen ? 12 : 0,
          overflow: 'hidden', cursor: searchOpen ? 'text' : 'pointer',
          transition: 'width .3s cubic-bezier(.4,0,.2,1), background .2s, border-color .2s',
          flexShrink: 0,
        }} onClick={() => !searchOpen && setSearchOpen(true)}>
          <Search size={14} style={{ flexShrink: 0, color: searchOpen ? 'var(--rs-primary)' : '#fff', transition: 'color .2s', margin: searchOpen ? '0 .5rem 0 0' : 'auto' }}/>
          <input
            ref={searchRef}
            placeholder="Pesquisar dramas..."
            onBlur={e => !e.currentTarget.value && setSearchOpen(false)}
            style={{ flex:1, minWidth:0, background:'none', border:'none', color:'#fff', fontFamily:'var(--rs-font-body)', fontSize:'.84rem', outline:'none', opacity: searchOpen ? 1 : 0, transition:'opacity .2s' }}
          />
        </div>

        {/* Bell */}
        <button className="nav-icon-btn"
          onMouseEnter={() => setHover('bell')} onMouseLeave={() => setHover(null)}
          style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', width: 34, height: 34, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', position: 'relative', transition: 'all .2s', flexShrink: 0 }}>
          <Bell size={14}/>
          {hasNotif && <span style={{ position:'absolute', top:6, right:6, width:7, height:7, borderRadius:'50%', background:'var(--rs-primary)', border:'1.5px solid #0e0e0e' }}/>}
        </button>

        {/* Coins */}
        {coins !== null && (
          <Link href="/pontos" className="nav-coins"
            style={{
              background: 'linear-gradient(135deg, rgba(255,217,61,.22) 0%, rgba(255,149,0,.10) 100%)',
              border: '1px solid rgba(255,217,61,.4)', borderRadius: 50,
              padding: '.35rem .75rem .35rem .6rem',
              display: 'inline-flex', alignItems: 'center', gap: '.35rem',
              color: 'var(--rs-accent)', textDecoration: 'none', flexShrink: 0,
              transition: 'all .2s',
            }}>
            <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:16, height:16, borderRadius:'50%', background:'var(--rs-grad-gold)', color:'#0a0a14', flexShrink: 0 }}>
              <Coins size={10}/>
            </span>
            <span className="nav-coins-val" style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'.88rem', color:'var(--rs-accent)', lineHeight:1 }}>
              {coins.toLocaleString('pt-AO')}
            </span>
          </Link>
        )}

        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setDropOpen(v => !v)}
            style={{ background:'none', border:'none', padding:0, cursor:'pointer', display:'inline-flex', borderRadius:'50%', transition:'transform .2s' }}>
            <div style={{ background:'var(--rs-grad-hero)', padding:2, borderRadius:'50%', boxShadow:'0 0 0 1.5px rgba(14,14,14,1), 0 4px 12px -4px rgba(255,56,92,.55)' }}>
              <div className="nav-avatar" style={{ width:30, height:30, borderRadius:'50%', background:'var(--rs-grad-hero)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'.78rem' }}>
                {loggedIn ? initial : 'E'}
              </div>
            </div>
            {loggedIn && <span style={{ position:'absolute', right:0, bottom:0, width:9, height:9, borderRadius:'50%', background:'#22c55e', border:'2px solid rgba(14,14,14,1)' }}/>}
          </button>

          {dropOpen && (
            <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'#222', border:'1px solid rgba(255,255,255,.1)', borderRadius:16, padding:'.5rem 0', minWidth:160, boxShadow:'0 8px 30px rgba(0,0,0,.5)', zIndex:200 }}>
              {loggedIn ? (<>
                <Link href="/perfil" onClick={() => setDropOpen(false)} style={{ display:'block', padding:'.55rem 1rem', fontSize:'var(--rs-body-sm)', color:'var(--rs-text-muted)' }}>Perfil</Link>
                <Link href="/inicio" onClick={() => setDropOpen(false)} style={{ display:'block', padding:'.55rem 1rem', fontSize:'var(--rs-body-sm)', color:'var(--rs-text-muted)' }}>Catálogo</Link>
                <hr style={{ border:'none', borderTop:'1px solid rgba(255,255,255,.07)', margin:'.3rem 0' }}/>
                <button onClick={() => { signOut(auth); window.location.href = '/' }} style={{ display:'block', width:'100%', textAlign:'left', padding:'.55rem 1rem', fontSize:'var(--rs-body-sm)', color:'var(--rs-text-muted)', background:'none', border:'none', cursor:'pointer' }}>Sair</button>
              </>) : (<>
                <Link href="/login" onClick={() => setDropOpen(false)} style={{ display:'block', padding:'.55rem 1rem', fontSize:'var(--rs-body-sm)', color:'var(--rs-text-muted)' }}>Entrar</Link>
                <Link href="/login?mode=register" onClick={() => setDropOpen(false)} style={{ display:'block', padding:'.55rem 1rem', fontSize:'var(--rs-body-sm)', color:'var(--rs-text-muted)' }}>Criar conta</Link>
              </>)}
            </div>
          )}
        </div>

        {!loggedIn && !coins && (
          <Link href="/login?mode=register" style={{ background:'var(--rs-grad-hero)', color:'#fff', padding:'.6rem 1.3rem', borderRadius:50, fontWeight:700, fontSize:'.88rem', textDecoration:'none', boxShadow:'0 8px 22px -8px rgba(255,56,92,.55)' }}>
            Começar grátis
          </Link>
        )}
      </div>

      <style>{`
        @media(max-width:768px) {
          .nav-desktop-links { display: none !important; }
          .rs-nav { height: calc(56px + env(safe-area-inset-top, 0px)) !important; padding: 0 .9rem !important; padding-top: env(safe-area-inset-top, 0px) !important; }
          .nav-logo-text { font-size: 1.15rem !important; }
          .nav-ao { font-size: .52rem !important; padding: .14rem .35rem !important; }
          .nav-actions { gap: .35rem !important; }
          .nav-search { display: none !important; }
          .nav-icon-btn { width: 30px !important; height: 30px !important; }
          .nav-coins { padding: .28rem .6rem .28rem .45rem !important; gap: .28rem !important; }
          .nav-coins-val { font-size: .8rem !important; }
          .nav-avatar { width: 28px !important; height: 28px !important; font-size: .72rem !important; }
        }
      `}</style>
    </header>
  )
}
