'use client'
import { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X, Star, SearchX } from 'lucide-react'
import Nav from '@/components/layout/Nav'
import BottomNav from '@/components/layout/BottomNav'
import Footer from '@/components/layout/Footer'
import { DRAMAS, BADGE_STYLE } from '@/lib/mock'
import { GENRE_LABELS } from '@/types'
import type { Drama } from '@/types'
import { useDramas } from '@/lib/useDramas'
import { cld } from '@/lib/cloudinary'

type Tab = 'emAlta' | 'novos' | 'maisVistos'

function DramaCard({ drama, onToast }: { drama: typeof DRAMAS[0]; onToast: (m: string) => void }) {
  const [hov, setHov] = useState(false)

  return (
    <Link
      href={`/detalhe/${drama.id}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'block',
        borderRadius: 16,
        border: `2px solid ${hov ? 'var(--rs-primary)' : 'transparent'}`,
        background: '#16213E',
        overflow: 'hidden',
        transform: hov ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'transform .25s var(--rs-ease), border-color .25s, box-shadow .25s',
        boxShadow: hov ? '0 20px 40px rgba(0,0,0,.6)' : 'none',
        position: 'relative',
        zIndex: hov ? 10 : 1,
        textDecoration: 'none',
      }}
    >
      {/* Poster */}
      <div style={{
        aspectRatio: '9/14',
        background: drama.posterGrad ?? 'var(--rs-poster-romance)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2.8rem', position: 'relative', overflow: 'hidden',
      }}>
        {(drama as any).posterImage
          ? <img src={cld((drama as any).posterImage, 400)} alt={drama.title} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} loading="lazy"/>
          : <span dangerouslySetInnerHTML={{ __html: drama.icon }} />
        }

        {drama.badge && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            fontSize: '.55rem', fontWeight: 700, padding: '.2rem .45rem',
            borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.5px',
            ...BADGE_STYLE[drama.badge],
          }}>{drama.badge}</div>
        )}

        {/* Bottom gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,.85) 0%, transparent 55%)',
        }} />

        {/* Play button — appears on hover */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(255,56,92,.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hov ? 1 : 0,
          transition: 'opacity .2s',
          zIndex: 2,
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="#fff">
            <path d="M3 2.5l10 5.5-10 5.5z" />
          </svg>
        </div>
      </div>

      {/* Info below poster */}
      <div style={{ padding: '.75rem' }}>
        <div style={{
          fontSize: '.9rem', fontWeight: 700, lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          color: '#fff',
        }}>
          {drama.title}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '.35rem',
        }}>
          <span style={{ fontSize: 'var(--rs-body-xs)', color: '#8892A4' }}>
            {drama.episodes.length} ep
          </span>
          <span style={{
            fontSize: 'var(--rs-body-xs)', fontWeight: 700, color: 'var(--rs-accent)',
            display: 'flex', alignItems: 'center', gap: '.2rem',
          }}>
            <Star size={10} fill="currentColor" /> {drama.rating}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function ExplorarPage() {
  return (
    <Suspense fallback={null}>
      <ExplorarPageInner />
    </Suspense>
  )
}

function ExplorarPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [genre, setGenre] = useState<Drama['genre'] | 'todos'>('todos')
  const [tab, setTab] = useState<Tab>('emAlta')
  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }
  const { dramas: LIVE_DRAMAS, loading: dramasLoading, error: dramasError } = useDramas()

  const filtered = useMemo(() => {
    let d = LIVE_DRAMAS.filter(dr =>
      (genre === 'todos' || dr.genre === genre) &&
      (query === '' || dr.title.toLowerCase().includes(query.toLowerCase()) ||
        dr.description.toLowerCase().includes(query.toLowerCase()))
    )
    if (tab === 'emAlta') d = [...d].sort((a, b) => b.rating - a.rating)
    else if (tab === 'novos') d = d.filter(dr => dr.badge === 'NOVO' || dr.badge === 'HOT')
    else d = [...d].sort((a, b) => b.views - a.views)
    return d
  }, [query, genre, tab, LIVE_DRAMAS])

  const genres = Object.keys(GENRE_LABELS) as Drama['genre'][]

  const [featuredIdx, setFeaturedIdx] = useState(0)

  const featuredList = useMemo(() => [...LIVE_DRAMAS].sort((a, b) => b.rating - a.rating).slice(0, 5), [LIVE_DRAMAS])
  const featured = featuredList[featuredIdx] ?? featuredList[0]

  // Auto-rotate featured banner every 7s
  useEffect(() => {
    if (featuredList.length === 0) return
    const t = setInterval(() => setFeaturedIdx(i => (i + 1) % featuredList.length), 7000)
    return () => clearInterval(t)
  }, [featuredList])

  return (
    <div style={{
      background: '#1A1A2E',
      minHeight: '100dvh',
      color: '#fff',
      fontFamily: 'var(--rs-font-body)',
    }}>
      <Nav activeLink="/explorar" />

      {/* Sticky top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(26,26,46,.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,56,92,.1)',
        padding: 'calc(var(--rs-nav-h) + .75rem) 4% .75rem',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '.75rem' }}>
          <Search
            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}
            size={16} color="#8892A4"
          />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pesquisar series, generos..."
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#16213E',
              border: '2px solid rgba(255,56,92,.2)',
              color: '#fff',
              padding: '.75rem 2.6rem .75rem 2.8rem',
              borderRadius: 50,
              fontSize: 'var(--rs-body-md)', outline: 'none',
              transition: 'border-color .2s',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Limpar pesquisa"
              style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#8892A4', display: 'flex', padding: 0,
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Genre filter chips */}
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          scrollbarWidth: 'none', paddingBottom: '.5rem',
        }}>
          {(['todos', ...genres] as Array<Drama['genre'] | 'todos'>).map(g => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              style={{
                flexShrink: 0,
                padding: '.35rem .9rem',
                borderRadius: 50,
                border: `2px solid ${genre === g ? 'var(--rs-primary)' : 'rgba(255,56,92,.15)'}`,
                background: genre === g ? 'rgba(255,56,92,.15)' : '#16213E',
                color: genre === g ? '#fff' : '#8892A4',
                fontSize: 'var(--rs-body-xs)', fontWeight: 700,
                cursor: 'pointer',
                transition: 'background .18s, border-color .18s, color .18s',
              }}
            >
              {g === 'todos' ? 'Todos' : GENRE_LABELS[g]}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          marginTop: '.2rem',
        }}>
          {([['emAlta', 'Em Alta'], ['novos', 'Novos'], ['maisVistos', 'Mais Vistos']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '.65rem 1rem',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 'var(--rs-body-sm)', fontWeight: 700,
                color: tab === key ? 'var(--rs-primary)' : '#8892A4',
                borderBottom: `3px solid ${tab === key ? 'var(--rs-primary)' : 'transparent'}`,
                marginBottom: -1,
                transition: 'color .18s, border-color .18s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured banner */}
      {!query && genre === 'todos' && featured && (
        <div style={{ padding: '1.2rem 4% .5rem' }}>
          <div style={{
            borderRadius: 20,
            height: 220,
            background: featured.posterGrad ?? 'var(--rs-grad-hero)',
            backgroundImage: (featured as any).bannerImage ? `url(${cld((featured as any).bannerImage, 1200)})` : undefined,
            backgroundSize: 'cover', backgroundPosition: 'center',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-end',
            transition: 'background-image .5s ease',
          }}>
            {/* Big emoji bg */}
            <div style={{
              position: 'absolute', right: '5%', top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '6rem', opacity: .35,
            }}>
              <span dangerouslySetInnerHTML={{ __html: featured.icon }} />
            </div>
            {/* Overlay gradient */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,.85) 0%, rgba(0,0,0,.1) 70%)',
            }} />
            {/* Content */}
            <div style={{ position: 'relative', zIndex: 2, padding: '1.4rem 1.6rem' }}>
              <div style={{
                display: 'inline-block',
                background: 'rgba(255,56,92,.25)',
                border: '1px solid rgba(255,56,92,.5)',
                borderRadius: 50,
                padding: '.2rem .7rem',
                fontSize: 'var(--rs-body-2xs)', fontWeight: 700,
                color: 'var(--rs-primary)',
                marginBottom: '.6rem',
              }}>
                EM DESTAQUE
              </div>
              <div style={{
                fontFamily: 'var(--rs-font-display)',
                fontWeight: 900, fontSize: '1.4rem',
                lineHeight: 1.2, marginBottom: '.5rem',
              }}>
                {featured.title}
              </div>
              <div style={{ fontSize: 'var(--rs-body-xs)', color: 'rgba(255,255,255,.7)', marginBottom: '.8rem' }}>
                <span style={{ color: 'var(--rs-accent)', fontWeight: 700 }}>★ {featured.rating}</span>
                &ensp;·&ensp;{featured.episodes.length} episodios
              </div>
              <Link href={`/feed?id=${featured.id}`} onClick={(e) => { e.preventDefault(); router.push(`/feed?id=${featured.id}&_n=${Date.now()}`) }} style={{
                display: 'inline-flex', alignItems: 'center', gap: '.4rem',
                background: 'var(--rs-grad-hero)',
                color: '#fff', textDecoration: 'none',
                padding: '.5rem 1.1rem', borderRadius: 50,
                fontSize: 'var(--rs-body-sm)', fontWeight: 700,
                boxShadow: 'var(--rs-shadow-btn)',
              }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="#fff"><path d="M3 2.5l10 5.5-10 5.5z" /></svg>
                Assistir
              </Link>
              {/* Navigation dots */}
              {featuredList.length > 1 && (
                <div style={{ display:'flex', gap:4, marginTop:'.7rem' }}>
                  {featuredList.map((d, i) => (
                    <div key={d.id} onClick={e => { e.preventDefault(); setFeaturedIdx(i) }}
                      style={{ width: i===featuredIdx ? 18 : 5, height: 5, borderRadius: 3, cursor: 'pointer',
                        background: i===featuredIdx ? 'var(--rs-primary)' : 'rgba(255,255,255,.35)',
                        transition: 'width .3s, background .3s' }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {dramasError && (
        <div style={{ margin: '.8rem 4% 0', padding: '.6rem .9rem', background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 10, fontSize: '.78rem', color: '#f59e0b' }}>
          ⚠️ {dramasError}
        </div>
      )}

      {/* Results count */}
      <div style={{ padding: '.8rem 4% .3rem', fontSize: 'var(--rs-body-xs)', color: '#8892A4' }}>
        {dramasLoading ? 'A carregar séries...' : `${filtered.length} ${filtered.length === 1 ? 'série' : 'séries'} encontradas`}
      </div>

      {/* Drama grid */}
      <div style={{
        padding: '.4rem 4% 6rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
        gap: '1.2rem',
      }}>
        {dramasLoading && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ aspectRatio: '2/3', borderRadius: 14, background: 'rgba(255,255,255,.06)', animation: 'rs-pulse 1.4s ease-in-out infinite' }} />
        ))}
        {!dramasLoading && filtered.map(drama => (
          <DramaCard key={drama.id} drama={drama} onToast={showToast} />
        ))}
        {!dramasLoading && filtered.length === 0 && (
          <div style={{
            gridColumn: '1/-1',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            padding: '1.8rem 1.4rem',
            background: 'var(--rs-bg-card)', border: '1px solid var(--rs-border-soft)', borderRadius: 16,
            margin: '.5rem 0',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(255,56,92,.15), rgba(255,56,92,.02))',
              border: '1px solid rgba(255,56,92,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--rs-primary)', marginBottom: '.9rem',
            }}>
              <SearchX size={26} strokeWidth={1.6} />
            </div>
            <div style={{ fontFamily: 'var(--rs-font-display)', fontSize: '1.1rem', fontWeight: 900, marginBottom: '.3rem', letterSpacing: '-.01em' }}>
              Nenhum drama encontrado
            </div>
            <div style={{ color: '#8892A4', fontSize: '.78rem', lineHeight: 1.5, maxWidth: 240, marginBottom: '.8rem' }}>
              Tenta uma palavra-chave diferente ou explora todos os géneros.
            </div>
            <button
              onClick={() => { setQuery(''); setGenre('todos') }}
              style={{
                background: 'rgba(255,56,92,.15)', border: '1px solid rgba(255,56,92,.3)',
                color: '#fff', padding: '.45rem .9rem', borderRadius: 50,
                fontSize: '.78rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      <BottomNav />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(22,33,62,.97)', border: '1px solid rgba(255,56,92,.3)',
          borderRadius: 50, padding: '.65rem 1.4rem', color: '#fff',
          fontSize: 'var(--rs-body-sm)', fontWeight: 600,
          boxShadow: '0 8px 30px rgba(0,0,0,.5)', zIndex: 999, whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}

      <style>{`
        input::placeholder { color: #8892A4; }
        input { font-family: var(--rs-font-body); }
        input:focus { border-color: var(--rs-primary) !important; }
        ::-webkit-scrollbar { display: none; }
        @keyframes rs-pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
      `}</style>
    </div>
  )
}
