'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap, Gift, Star, Coins, Crown, Check, Flame, Infinity, ShieldCheck, Plus } from 'lucide-react'
import Nav from '@/components/layout/Nav'
import BottomNav from '@/components/layout/BottomNav'
import Footer from '@/components/layout/Footer'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { EPISODE_COST } from '@/lib/constants'

const fmt = (n: number) => n.toLocaleString('pt-AO')

type Ribbon = { label: string; hot: boolean } | null

const PACKAGES: {
  key: string; name: string; pts: number; bonus: number; priceKz: number; priceOld: number | null;
  perPt: string; episodes: number; features: string[]; cta: string; ribbon: Ribbon;
  Icon: typeof Gift; tier: string; url: string;
}[] = [
  {
    key:        'basic',
    name:       'Básico',
    pts:        100,
    bonus:      0,
    priceKz:    1000,
    priceOld:   null,
    perPt:      'Kz 10 por ponto',
    episodes:   2,
    features:   ['2 episódios desbloqueados', 'Sem expiração', 'Pagamento único'],
    cta:        'Adquirir Básico',
    ribbon:     null,
    Icon:       Gift,
    tier:       'basic',
    url:        process.env.NEXT_PUBLIC_KURSINHA_BASIC_URL   ?? 'https://pay.kursinha.com/c/6a01a97460b5a002d3e34d85',
  },
  {
    key:        'popular',
    name:       'Popular',
    pts:        550,
    bonus:      50,
    priceKz:    4500,
    priceOld:   5500,
    perPt:      'Kz 7,5 por ponto',
    episodes:   11,
    features:   ['11 episódios desbloqueados', '+50 pts bónus incluídos', 'Poupa 18% vs Básico'],
    cta:        'Adquirir Popular',
    ribbon:     { label: 'Mais vendido', hot: true },
    Icon:       Star,
    tier:       'popular',
    url:        process.env.NEXT_PUBLIC_KURSINHA_POPULAR_URL ?? 'https://pay.kursinha.com/c/6a01aa75f10214290866c137',
  },
  {
    key:        'mega',
    name:       'Mega',
    pts:        1400,
    bonus:      200,
    priceKz:    9900,
    priceOld:   14000,
    perPt:      'Kz 6,2 por ponto',
    episodes:   28,
    features:   ['28 episódios desbloqueados', '+200 pts bónus incluídos', 'Poupa 29% vs Básico'],
    cta:        'Adquirir Mega',
    ribbon:     null,
    Icon:       Coins,
    tier:       'mega',
    url:        process.env.NEXT_PUBLIC_KURSINHA_MEGA_URL    ?? 'https://pay.kursinha.com/c/6a01ab0a9b9ba2580ae9aee7',
  },
  {
    key:        'vip',
    name:       'Ultra VIP',
    pts:        4000,
    bonus:      500,
    priceKz:    24900,
    priceOld:   40000,
    perPt:      'Kz 5,5 por ponto',
    episodes:   80,
    features:   ['80 episódios desbloqueados', '+500 pts bónus incluídos', 'Poupa 38% vs Básico', 'Acesso antecipado a novidades'],
    cta:        'Tornar-me Ultra VIP',
    ribbon:     { label: 'Ultra VIP', hot: false },
    Icon:       Crown,
    tier:       'ultra',
    url:        process.env.NEXT_PUBLIC_KURSINHA_VIP_URL     ?? 'https://pay.kursinha.com/c/6a01aba1f10214290866c138',
  },
]

const TIER_STYLES = {
  basic: {
    stripe:      'linear-gradient(90deg,#667eea,#764ba2)',
    iconBg:      'rgba(102,126,234,.12)',
    iconColor:   '#93a4ee',
    checkBg:     'rgba(102,126,234,.18)',
    checkColor:  '#93a4ee',
    ptsColor:    'var(--rs-accent)',
    ctaBg:       'linear-gradient(135deg,#667eea,#764ba2)',
    ctaColor:    '#fff',
    hoverBorder: 'rgba(102,126,234,.45)',
    cardBg:      'linear-gradient(180deg,rgba(255,255,255,.035) 0%,rgba(255,255,255,.01) 100%)',
    borderColor: 'rgba(255,255,255,.08)',
  },
  popular: {
    stripe:      'var(--rs-grad-hero)',
    iconBg:      'rgba(255,56,92,.15)',
    iconColor:   '#ff6b85',
    checkBg:     'rgba(255,255,255,.18)',
    checkColor:  '#fff',
    ptsColor:    '#fff',
    ctaBg:       '#fff',
    ctaColor:    '#0a0a14',
    hoverBorder: 'rgba(255,56,92,.5)',
    cardBg:      'linear-gradient(160deg,rgba(255,56,92,.12) 0%,rgba(255,255,255,.015) 70%)',
    borderColor: 'rgba(255,56,92,.45)',
  },
  mega: {
    stripe:      'var(--rs-grad-gold)',
    iconBg:      'rgba(255,217,61,.12)',
    iconColor:   'var(--rs-accent)',
    checkBg:     'rgba(255,217,61,.18)',
    checkColor:  'var(--rs-accent)',
    ptsColor:    'var(--rs-accent)',
    ctaBg:       'var(--rs-grad-gold)',
    ctaColor:    '#0a0a14',
    hoverBorder: 'rgba(255,217,61,.45)',
    cardBg:      'linear-gradient(180deg,rgba(255,255,255,.035) 0%,rgba(255,255,255,.01) 100%)',
    borderColor: 'rgba(255,255,255,.08)',
  },
  ultra: {
    stripe:      'linear-gradient(90deg,#a855f7,#6366f1)',
    iconBg:      'rgba(168,85,247,.15)',
    iconColor:   '#c084fc',
    checkBg:     'rgba(168,85,247,.18)',
    checkColor:  '#c084fc',
    ptsColor:    'var(--rs-accent)',
    ctaBg:       'linear-gradient(135deg,#a855f7,#6366f1)',
    ctaColor:    '#fff',
    hoverBorder: 'rgba(168,85,247,.45)',
    cardBg:      'linear-gradient(180deg,rgba(255,255,255,.035) 0%,rgba(255,255,255,.01) 100%)',
    borderColor: 'rgba(255,255,255,.08)',
  },
}

export default function PontosPage() {
  const [coins, setCoins]     = useState<number | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [uid, setUid]         = useState<string | null>(null)
  const [history, setHistory] = useState<{ pts: number; date: string; pkg: string }[]>([])
  const [packages, setPackages] = useState(PACKAGES)

  // Apply admin overrides (name/pts/bonus/priceKz/badge) from Firestore "packages" collection,
  // recomputing the derived fields (episodes, per-point price, feature copy) so the card
  // stays consistent with the overridden numbers.
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'packages'))
        if (snap.empty) return
        const overrides = new Map(snap.docs.map(d => [d.id, d.data()]))
        setPackages(prev => prev.map(pkg => {
          const o = overrides.get(pkg.key)
          if (!o) return pkg
          const pts     = o.pts     ?? pkg.pts
          const bonus   = o.bonus   ?? pkg.bonus
          const priceKz = o.priceKz ?? pkg.priceKz
          const total    = pts + bonus
          const episodes = Math.floor(total / EPISODE_COST)
          const perPt    = `Kz ${(priceKz / total).toFixed(1).replace('.', ',')} por ponto`
          const features = pkg.features.map(f =>
            f.endsWith('episódios desbloqueados') ? `${episodes} episódios desbloqueados`
            : f.endsWith('pts bónus incluídos')    ? `+${fmt(bonus)} pts bónus incluídos`
            : f
          )
          return {
            ...pkg,
            name: o.name ?? pkg.name,
            pts, bonus, priceKz, episodes, perPt, features,
            ribbon: o.badge ? { label: o.badge, hot: pkg.tier === 'popular' } : pkg.ribbon,
          }
        }))
      } catch { /* keep defaults */ }
    })()
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      setLoggedIn(!!user)
      if (!user) return
      setUid(user.uid)
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists()) {
          const d = snap.data()
          setCoins(d.coins ?? 0)
          setHistory(d.pointsHistory ?? [])
        }
      } catch { /* silent */ }
    })
    return unsub
  }, [])

  const handleBuy = (baseUrl: string) => {
    if (!uid) { window.location.href = '/login?next=/pontos'; return }
    const url = `${baseUrl}?metadata[userId]=${encodeURIComponent(uid)}&success_url=${encodeURIComponent(window.location.origin + '/kursinha-success')}`
    window.open(url, '_blank', 'noopener')
  }

  return (
    <div style={{ background: 'var(--rs-bg-warm)', minHeight: '100dvh', color: '#fff', fontFamily: 'var(--rs-font-body)', paddingTop: 'var(--rs-nav-h)' }}>
      <Nav activeLink="/pontos" />

      {/* Atmospheric backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(255,56,92,.14), transparent 70%), radial-gradient(ellipse 40% 30% at 90% 100%, rgba(255,217,61,.08), transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto', padding: '4.5rem 2rem 3.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', fontSize: '.74rem', fontWeight: 800, color: 'var(--rs-primary)', textTransform: 'uppercase', letterSpacing: '2px', background: 'rgba(255,56,92,.08)', border: '1px solid rgba(255,56,92,.25)', padding: '.45rem 1rem', borderRadius: 50, marginBottom: '1.2rem' }}>
            <Zap size={13} /> Loja de Pontos
          </div>

          <h1 style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: 'clamp(2.2rem,5vw,3.8rem)', lineHeight: 1.02, letterSpacing: '-.018em', margin: '0 0 1rem' }}>
            Escolhe o teu plano e{' '}
            <em style={{ color: 'var(--rs-primary)', fontStyle: 'italic' }}>maratona sem parar.</em>
          </h1>

          <p style={{ color: 'var(--rs-text-muted)', fontSize: '1.05rem', lineHeight: 1.55, marginBottom: '1.4rem' }}>
            Desbloqueia episódios e vive as melhores histórias — em vertical, em português, no teu bolso.
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.55rem', background: 'rgba(34,197,94,.10)', border: '1px solid rgba(34,197,94,.3)', color: '#22c55e', padding: '.55rem 1.1rem', borderRadius: 50, fontSize: '.84rem', fontWeight: 700, letterSpacing: '.2px', marginBottom: '2rem' }}>
            <Infinity size={14} /> Todos os planos têm acesso vitalício — pontos nunca expiram
          </div>

          {/* Balance */}
          {loggedIn ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,217,61,.06)', border: '1px solid rgba(255,217,61,.2)', borderRadius: 20, padding: '1rem 2rem' }}>
              <span style={{ fontSize: '2rem' }}>🪙</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '2rem', color: 'var(--rs-accent)', lineHeight: 1 }}>
                  {coins !== null ? fmt(coins) : '...'}
                </div>
                <div style={{ fontSize: '.78rem', color: '#8892A4', marginTop: '.2rem' }}>pontos disponíveis</div>
              </div>
            </div>
          ) : (
            <Link href="/login?next=/pontos" style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: 'var(--rs-grad-hero)', color: '#fff', padding: '.7rem 1.8rem', borderRadius: 50, fontSize: '.9rem', fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 22px -8px rgba(255,56,92,.55)' }}>
              Entra para ver o teu saldo →
            </Link>
          )}
        </div>

        {/* ── Packages grid ── */}
        <div className="pts-grid" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 2rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.2rem' }}>
          {packages.map(pkg => {
            const ts = TIER_STYLES[pkg.tier as keyof typeof TIER_STYLES]
            const isPopular = pkg.tier === 'popular'
            const total = pkg.pts + pkg.bonus

            return (
              <article key={pkg.key} className={`pts-card pts-${pkg.tier}`} style={{
                background: ts.cardBg,
                border: `1.5px solid ${ts.borderColor}`,
                borderRadius: 24,
                padding: '2rem 1.6rem 1.8rem',
                position: 'relative',
                display: 'flex', flexDirection: 'column',
                transition: 'transform .3s, border-color .25s, box-shadow .3s',
                ...(isPopular ? { borderColor: ts.borderColor, boxShadow: '0 20px 60px -20px rgba(255,56,92,.35)', transform: 'translateY(-8px) scale(1.02)' } : {}),
              }}>
                {/* Top stripe */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: ts.stripe, borderRadius: '22px 22px 0 0' }} />

                {/* Ribbon */}
                {pkg.ribbon && (
                  <div style={{
                    position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                    display: 'inline-flex', alignItems: 'center', gap: '.35rem',
                    fontSize: '.62rem', fontWeight: 800, padding: '.3rem .9rem',
                    borderRadius: 50, textTransform: 'uppercase', letterSpacing: '1.2px',
                    whiteSpace: 'nowrap', boxShadow: '0 8px 20px -6px rgba(0,0,0,.4)',
                    background: pkg.ribbon.hot ? 'var(--rs-grad-hero)' : 'linear-gradient(135deg,#a855f7,#6366f1)',
                    color: '#fff',
                    ...(pkg.ribbon.hot ? { boxShadow: '0 8px 24px -6px rgba(255,56,92,.55)' } : {}),
                  }}>
                    {pkg.ribbon.hot ? <Flame size={11} /> : <Crown size={11} />}
                    {pkg.ribbon.label}
                  </div>
                )}

                {/* Content */}
                <div style={{ textAlign: 'center', flex: 1 }}>
                  {/* Icon */}
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: ts.iconBg, border: '1px solid rgba(255,255,255,.08)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: ts.iconColor }}>
                    <pkg.Icon size={22} />
                  </div>

                  {/* Name */}
                  <div style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.65rem', marginTop: '1rem', letterSpacing: '-.01em' }}>{pkg.name}</div>

                  {/* Points */}
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '.3rem', marginTop: '1.4rem' }}>
                    <span style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '3.2rem', lineHeight: 1, color: ts.ptsColor, letterSpacing: '-.02em' }}>{fmt(total)}</span>
                    <span style={{ fontSize: '.92rem', color: isPopular ? 'rgba(255,255,255,.7)' : 'var(--rs-text-muted)', fontWeight: 600 }}>pts</span>
                  </div>

                  {/* Bonus chip */}
                  {pkg.bonus > 0 ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', marginTop: '.6rem', background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', color: '#22c55e', fontSize: '.7rem', fontWeight: 700, padding: '.22rem .65rem', borderRadius: 50 }}>
                      <Plus size={10} />+{fmt(pkg.bonus)} pts bónus
                    </div>
                  ) : (
                    <div style={{ marginTop: '.6rem', height: 22 }} />
                  )}

                  {/* Price */}
                  <div style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.85rem', lineHeight: 1.1, marginTop: '.9rem', letterSpacing: '-.01em' }}>
                    Kz {fmt(pkg.priceKz)}
                  </div>
                  <div style={{ fontSize: '.78rem', color: 'var(--rs-text-muted)', marginTop: '.2rem' }}>{pkg.perPt}</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--rs-text-muted)', textDecoration: 'line-through', marginTop: '.25rem', minHeight: '1.1rem' }}>
                    {pkg.priceOld ? `De Kz ${fmt(pkg.priceOld)}` : ''}
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: isPopular ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.08)', margin: '1.4rem 0 1.2rem' }} />

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.6rem', display: 'flex', flexDirection: 'column', gap: '.7rem', fontSize: '.86rem', color: 'rgba(255,255,255,.85)' }}>
                  {pkg.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', lineHeight: 1.4 }}>
                      <span style={{ width: 18, height: 18, flexShrink: 0, borderRadius: '50%', background: ts.checkBg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={11} color={ts.checkColor} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleBuy(pkg.url)}
                  className={`pts-cta pts-cta-${pkg.tier}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', padding: '.95rem', borderRadius: 14, fontFamily: 'var(--rs-font-body)', fontWeight: 700, fontSize: '.94rem', color: ts.ctaColor, background: ts.ctaBg, border: 'none', cursor: 'pointer', width: '100%', transition: 'transform .2s, box-shadow .2s, opacity .2s' }}
                >
                  {pkg.cta}
                </button>
              </article>
            )
          })}
        </div>

        {/* Fine print */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.6rem', flexWrap: 'wrap', padding: '0 2rem 1.5rem', fontSize: '.82rem', color: 'var(--rs-text-muted)' }}>
          <ShieldCheck size={14} color="#22c55e" />
          <span>Todos os planos são de pagamento único</span>
          <span style={{ width: 3, height: 3, background: 'currentColor', borderRadius: '50%', opacity: .5, display: 'inline-block' }} />
          <span>Pontos válidos para sempre</span>
          <span style={{ width: 3, height: 3, background: 'currentColor', borderRadius: '50%', opacity: .5, display: 'inline-block' }} />
          <span>Pagamento seguro via Kursinha · Multicaixa · ATM · TPA</span>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '1rem 2rem 2rem' }}>
            <h2 style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.2rem', marginBottom: '.75rem' }}>Histórico de compras</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...history].reverse().slice(0, 6).map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem 1rem', background: 'rgba(255,255,255,.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,.06)' }}>
                  <div>
                    <div style={{ fontSize: '.88rem', fontWeight: 600 }}>{h.pkg}</div>
                    <div style={{ fontSize: '.76rem', color: '#8892A4' }}>{h.date}</div>
                  </div>
                  <span style={{ color: 'var(--rs-accent)', fontWeight: 700, fontSize: '.88rem' }}>+{fmt(h.pts)} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: '5rem' }} />
      </div>

      <BottomNav />

      <style>{`
        .pts-grid { padding-bottom: 1rem; }
        @media (max-width: 1024px) { .pts-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 600px)  { .pts-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 600px)  { .pts-popular { transform: none !important; } }

        .pts-card:hover { transform: translateY(-6px) !important; box-shadow: 0 24px 50px -16px rgba(0,0,0,.55) !important; }
        .pts-popular:hover { transform: translateY(-12px) scale(1.02) !important; box-shadow: 0 30px 70px -16px rgba(255,56,92,.45) !important; }
        .pts-basic:hover   { border-color: rgba(102,126,234,.45) !important; }
        .pts-mega:hover    { border-color: rgba(255,217,61,.45) !important; }
        .pts-ultra:hover   { border-color: rgba(168,85,247,.45) !important; }

        .pts-cta:hover { transform: translateY(-2px); }
        .pts-cta-popular:hover { background: var(--rs-accent) !important; color: #0a0a14 !important; box-shadow: 0 14px 30px -8px rgba(255,217,61,.5); }
        .pts-cta-basic:hover   { box-shadow: 0 14px 30px -10px rgba(102,126,234,.55); }
        .pts-cta-mega:hover    { box-shadow: 0 14px 30px -10px rgba(255,217,61,.5); opacity: .9; }
        .pts-cta-ultra:hover   { box-shadow: 0 14px 30px -10px rgba(168,85,247,.55); }
      `}</style>
    </div>
  )
}
