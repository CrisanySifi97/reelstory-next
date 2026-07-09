'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Play, Plus, Share2, Lock, Star, Eye,
  Coins, Download, Trash2, Loader2,
} from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import { DRAMAS, BADGE_STYLE } from '@/lib/mock'
import { GENRE_LABELS } from '@/types'
import Poster from '@/components/Poster'
import StarRating from '@/components/StarRating'
import { useRating } from '@/lib/useRating'
import { useMyList } from '@/lib/useMyList'
import { useDrama, useDramas } from '@/lib/useDramas'
import { auth, db } from '@/lib/firebase'
import { cld, hdUrl } from '@/lib/cloudinary'
import { doc, onSnapshot } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import type { Episode } from '@/types'
import { useDownloads } from '@/lib/useDownloads'
import { EPISODE_COST } from '@/lib/constants'

type EpisodeWithId = Episode & { id: string }

const PLACEHOLDER_CAST: Record<string, string[]> = {
  romance:     ['Sofia Mendes', 'Daniel Lopes', 'Ana Carvalho'],
  corporativo: ['Ricardo Silva', 'Mariana Costa', 'Paulo Ferreira'],
  suspense:    ['Carlos Neto', 'Beatriz Santos', 'Miguel Torres'],
  comedia:     ['Luís Faria', 'Catarina Pinto', 'Jorge Alves'],
  terror:      ['Isabel Rocha', 'António Gomes', 'Vera Cunha'],
  acao:        ['Hélder Moreira', 'Sandra Lima', 'Nuno Correia'],
}

/** Derives a thumbnail image URL for an episode — a Cloudinary/Bunny video frame or a YouTube thumbnail */
function episodeThumb(ep: EpisodeWithId): string | null {
  if (ep.thumbnail) return ep.thumbnail
  if (ep.url?.includes('.b-cdn.net')) {
    const guid = ep.url.split('/').find(part => /^[0-9a-f-]{36}$/i.test(part))
    // Bunny Stream (has a video GUID) auto-generates a thumbnail; plain Bunny
    // Storage files (uploaded directly, no GUID) have no frame to derive one from.
    return guid ? `https://${new URL(ep.url).hostname}/${guid}/thumbnail.jpg` : null
  }
  if (ep.url?.includes('res.cloudinary.com')) return ep.url.replace('/video/upload/', '/video/upload/so_0,q_auto/').replace(/\.\w+$/, '.jpg')
  if (ep.ytId) return `https://img.youtube.com/vi/${ep.ytId}/mqdefault.jpg`
  return null
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

/* ── Rating section ── */
function RatingSection({ dramaId, dramaTitle }: { dramaId: string; dramaTitle: string }) {
  const { uid, userRating, summary, rate, submitting, rateError } = useRating(dramaId)
  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const handleRate = async (n: number) => {
    if (!uid) { window.location.href = '/login'; return }
    const ok = await rate(n)
    if (ok) showToast(n >= 4 ? `Obrigado pela tua avaliação de ${n} ★!` : 'Avaliação guardada!')
    else showToast(`Erro: ${rateError || 'tenta de novo'}`)
  }

  const pct = (k: number) => summary.count > 0 ? Math.round(((summary.dist[k] ?? 0) / summary.count) * 100) : 0

  return (
    <section style={{ maxWidth:1100, margin:'0 auto', padding:'2rem 4% 0' }}>
      <div style={{ background:'#1A1A2E', border:'1px solid rgba(255,255,255,.06)', borderRadius:20, padding:'1.5rem 1.8rem', display:'flex', gap:'2.5rem', flexWrap:'wrap', alignItems:'center' }}>

        {/* Average score */}
        <div style={{ textAlign:'center', minWidth:110 }}>
          <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'3.5rem', color:'var(--rs-accent)', lineHeight:1 }}>
            {summary.avg > 0 ? summary.avg.toFixed(1) : (userRating > 0 ? userRating.toFixed(1) : '—')}
          </div>
          <StarRating value={summary.avg || userRating} size={16} readOnly showValue={false}/>
          <div style={{ fontSize:'.72rem', color:'#8892A4', marginTop:'.4rem' }}>
            {summary.count > 0 ? `${summary.count} avaliações` : 'Sem avaliações'}
          </div>
        </div>

        {/* Distribution bars */}
        <div style={{ flex:1, minWidth:180, display:'flex', flexDirection:'column', gap:'.35rem' }}>
          {[5,4,3,2,1].map(k => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
              <span style={{ fontSize:'.7rem', color:'#8892A4', width:8, textAlign:'right', flexShrink:0 }}>{k}</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill={(summary.dist[k] ?? 0) > 0 ? 'var(--rs-accent)' : 'rgba(255,255,255,.15)' } stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <div style={{ flex:1, height:6, background:'rgba(255,255,255,.08)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct(k)}%`, background:'var(--rs-accent)', borderRadius:3, transition:'width .4s' }}/>
              </div>
              <span style={{ fontSize:'.68rem', color:'#8892A4', width:26, flexShrink:0 }}>{summary.dist[k] ?? 0}</span>
            </div>
          ))}
        </div>

        {/* User rating */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'.6rem', minWidth:160 }}>
          <div style={{ fontSize:'.75rem', color:'#8892A4', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px' }}>
            {userRating > 0 ? 'A tua avaliação' : 'Avalia esta série'}
          </div>
          <StarRating
            value={userRating}
            size={28}
            readOnly={submitting}
            showValue={false}
            onChange={handleRate}
          />
          {userRating > 0 && (
            <div style={{ fontSize:'.78rem', color:'var(--rs-accent)', fontWeight:700 }}>
              Tu deste {userRating} ★
            </div>
          )}
          {!uid && (
            <div style={{ fontSize:'.72rem', color:'#8892A4', textAlign:'center', lineHeight:1.4 }}>
              <a href="/login" style={{ color:'var(--rs-primary)', fontWeight:700 }}>Entra</a> para avaliar
            </div>
          )}
          {submitting && <div style={{ fontSize:'.72rem', color:'#8892A4' }}>A guardar...</div>}
        </div>
      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:'5rem', left:'50%', transform:'translateX(-50%)', background:'rgba(20,20,20,.97)', border:'1px solid rgba(255,255,255,.1)', borderRadius:50, padding:'.65rem 1.4rem', color:'#fff', fontSize:'var(--rs-body-sm)', fontWeight:600, boxShadow:'var(--rs-shadow-lg)', zIndex:999, whiteSpace:'nowrap', pointerEvents:'none' }}>
          {toast}
        </div>
      )}
    </section>
  )
}

/* ── Detail inner component ── */
export default function DetalheClient({ id }: { id: string }) {
  const router = useRouter()
  const dramaId = id
  const { drama: liveDrama, loading: dramaLoading } = useDrama(dramaId)
  const { dramas: allDramas } = useDramas()
  // Keep a safe non-null drama — show real data when ready, empty shell while loading
  const drama = (liveDrama ?? {
    id: dramaId, title: '', genre: 'romance', description: '', short: '',
    status: 'Ativo', rating: 0, views: 0, episodes: [], posterGrad: 'var(--rs-bg-warm)',
    badge: undefined, cast: [], year: 2026, icon: '',
  }) as typeof DRAMAS[0]
  const episodes = (drama.episodes ?? []) as EpisodeWithId[]

  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())
  const [coins, setCoins] = useState<number | null>(null)
  const { toggle, isInList } = useMyList()
  const inList = isInList(drama.id)
  const { download, remove: removeDownload, isDownloaded, isDownloading } = useDownloads()

  const freeCount   = episodes.filter((e, i) => e.free || i === 0).length
  const lockedCount = Math.max(0, episodes.length - freeCount)
  const cast        = (drama.cast && drama.cast.length > 0) ? drama.cast : (PLACEHOLDER_CAST[drama.genre] ?? ['Ana Silva', 'João Santos'])

  const similar = allDramas.filter(d => d.id !== drama.id && d.genre === drama.genre).slice(0, 4)

  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const handleShare = async () => {
    const url = `${window.location.origin}/detalhe/${drama.id}`
    if (navigator.share) {
      await navigator.share({ title: drama.title, text: `Vê "${drama.title}" na ReelStory`, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url).catch(() => {})
      showToast('Link copiado!')
    }
  }

  /* Firebase — load unlocked episodes + coins (live, so returning from
     /feed after unlocking an episode reflects the latest state) */
  useEffect(() => {
    let unsubDoc = () => {}
    const unsubAuth = onAuthStateChanged(auth, user => {
      unsubDoc()
      if (!user) { setUnlocked(new Set()); setCoins(null); return }
      unsubDoc = onSnapshot(doc(db, 'users', user.uid), snap => {
        if (snap.exists()) {
          const d = snap.data()
          setUnlocked(new Set(d.unlockedEpisodes ?? []))
          setCoins(d.coins ?? 0)
        }
      })
    })
    return () => { unsubDoc(); unsubAuth() }
  }, [])

  const isUnlocked = (ep: EpisodeWithId, idx = episodes.indexOf(ep)) =>
    idx === 0 || ep.free || unlocked.has(`${drama.id}_${ep.id}`)

  // Paid episodes' real URL lives in the protected "episodeUrls" collection —
  // resolve it for any episode the user has actually unlocked, so the
  // download button (which only appears for unlocked episodes) has a URL to use.
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({})
  useEffect(() => {
    const toFetch = episodes.filter((ep, i) => !ep.url && isUnlocked(ep, i) && !resolvedUrls[`${drama.id}_${ep.id}`])
    if (!toFetch.length) return
    let cancelled = false
    ;(async () => {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
      for (const ep of toFetch) {
        if (cancelled) return
        try {
          const qs = new URLSearchParams({ dramaId: drama.id, epId: String(ep.id) })
          const res = await fetch(`/api/episode-url?${qs}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
          if (!res.ok) continue
          const data = await res.json()
          if (!cancelled && data.url) setResolvedUrls(prev => ({ ...prev, [`${drama.id}_${ep.id}`]: data.url }))
        } catch { /* silent — download button just stays hidden */ }
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, drama.id])

  const [descExpanded, setDescExpanded] = useState(false)

  return (
    <div style={{
      minHeight: '100dvh',
      paddingBottom: 80,
      background: 'var(--rs-bg-warm)',
      color: '#fff',
      fontFamily: 'var(--rs-font-body)',
      opacity: dramaLoading ? 0 : 1,
      transition: 'opacity .3s',
    }}>

      {/* ── Overlay header (back + coins) ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1rem',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'linear-gradient(to bottom, rgba(0,0,0,.6) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <button
          onClick={() => router.back()}
          aria-label="Voltar"
          style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(0,0,0,.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', border: '1px solid rgba(255,255,255,.18)',
            cursor: 'pointer', flexShrink: 0, pointerEvents: 'all',
          }}
        >
          <ArrowLeft size={18} />
        </button>

        {coins !== null && (
          <Link href="/pontos" style={{
            display: 'flex', alignItems: 'center', gap: '.3rem',
            background: 'rgba(255,217,61,.15)',
            border: '1px solid rgba(255,217,61,.4)',
            borderRadius: 50, padding: '.3rem .75rem',
            color: 'var(--rs-accent)', fontSize: '.82rem', fontWeight: 700,
            textDecoration: 'none', pointerEvents: 'all',
          }}>
            <Coins size={13} /> {coins.toLocaleString('pt-AO')}
          </Link>
        )}
      </div>

      {/* ══ HERO ══ */}
      <div style={{
        height: '72vh',
        minHeight: 520,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Full-bleed background — banner image (landscape) or poster */}
        <div style={{ position: 'absolute', inset: 0 }}>
          {(drama as any).bannerImage ? (
            <>
              <img
                src={cld((drama as any).bannerImage, 1600)}
                alt={drama.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center' }}
              />
            </>
          ) : (
            <Poster drama={drama} size="hero" showInfo={false} />
          )}
        </div>

        {/* Protection gradient overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: (drama as any).bannerImage
            ? 'linear-gradient(to right, rgba(10,10,20,.92) 30%, rgba(10,10,20,.5) 65%, rgba(10,10,20,.1) 100%), linear-gradient(to top, rgba(10,10,20,1) 0%, transparent 50%)'
            : [
                'linear-gradient(to right, var(--rs-bg-warm) 20%, rgba(20,20,20,.5) 55%, rgba(20,20,20,.05) 100%)',
                'linear-gradient(to top, var(--rs-bg-warm) 0%, transparent 55%)',
              ].join(', '),
          pointerEvents: 'none',
        }} />

        {/* Hero content */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '0 4% 4rem',
          maxWidth: 720,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}>

          {/* Badge chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '.9rem' }}>
            {drama.badge && (
              <span style={{
                fontSize: '.6rem',
                fontWeight: 800,
                letterSpacing: '.5px',
                textTransform: 'uppercase',
                padding: '.22rem .65rem',
                borderRadius: 50,
                ...BADGE_STYLE[drama.badge],
              }}>
                {drama.badge}
              </span>
            )}
            <span style={{
              fontSize: '.6rem',
              fontWeight: 800,
              letterSpacing: '.5px',
              textTransform: 'uppercase',
              padding: '.22rem .65rem',
              borderRadius: 50,
              background: 'rgba(255,217,61,.15)',
              border: '1px solid rgba(255,217,61,.4)',
              color: 'var(--rs-accent)',
            }}>
              EXCLUSIVO
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: 'var(--rs-font-display)',
            fontWeight: 900,
            fontSize: 'clamp(1.6rem,3.5vw,2.8rem)',
            lineHeight: 1.05,
            letterSpacing: '-.02em',
            marginBottom: '.6rem',
          }}>
            {drama.title}
          </h1>

          {/* Meta row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '.6rem',
            flexWrap: 'wrap',
            fontSize: '.8rem',
            fontWeight: 700,
            marginBottom: '.8rem',
          }}>
            <span style={{ color: 'var(--rs-accent)', display: 'flex', alignItems: 'center', gap: '.25rem' }}>
              <Star size={13} fill="currentColor" /> {drama.rating}
            </span>
            <Dot />
            <span style={{ color: 'rgba(255,255,255,.6)' }}>{(drama as any).year || 2025}</span>
            <Dot />
            <span style={{ color: 'rgba(255,255,255,.6)' }}>{episodes.length} eps</span>
            <Dot />
            <span style={{ color: 'rgba(255,255,255,.6)' }}>{GENRE_LABELS[drama.genre]}</span>
          </div>

          {/* Description — 3 lines max with ver mais */}
          {drama.description && (
            <div style={{ marginBottom: '.8rem', maxWidth: 520 }}>
              <p style={{
                fontSize: 'clamp(.82rem,1.2vw,.95rem)',
                color: 'rgba(255,255,255,.75)',
                lineHeight: 1.6,
                margin: 0,
                ...(!descExpanded ? {
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical' as any,
                  overflow: 'hidden',
                } : {}),
              }}>
                {drama.description}
              </p>
              {drama.description.length > 120 && (
                <button
                  onClick={e => { e.stopPropagation(); setDescExpanded(v => !v) }}
                  style={{ background: 'none', border: 'none', color: 'var(--rs-primary)', fontSize: '.85rem', fontWeight: 700, cursor: 'pointer', padding: '4px 0 0', display: 'block' }}
                >
                  {descExpanded ? 'Ver menos ▲' : 'Ver mais ▼'}
                </button>
              )}
            </div>
          )}

          {/* Cast */}
          {cast.length > 0 && (
            <p style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.45)', marginBottom: '1.2rem' }}>
              <span style={{ color: 'rgba(255,255,255,.3)', fontWeight: 600 }}>Elenco: </span>
              {cast.join(' · ')}
            </p>
          )}

          {/* CTA buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
            {/* Play */}
            <Link
              href={`/feed?id=${drama.id}`}
              onClick={(e) => {
                // Append a cache-busting timestamp so re-entering the feed for the
                // same drama always gets a fresh player instance — otherwise the
                // feed could reuse a previous instance and resume at whatever
                // episode was last scrolled to, instead of episode 1.
                e.preventDefault()
                router.push(`/feed?id=${drama.id}&_n=${Date.now()}`)
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.45rem',
                background: '#fff',
                color: '#000',
                fontWeight: 800,
                fontSize: '.92rem',
                padding: '.7rem 1.6rem',
                borderRadius: 50,
                textDecoration: 'none',
                letterSpacing: '.02em',
                boxShadow: '0 6px 24px rgba(0,0,0,.4)',
                flexShrink: 0,
              }}
            >
              <Play size={16} fill="#000" />
              Assistir
            </Link>

            {/* + Minha Lista */}
            <button
              onClick={async () => {
                const r = await toggle(drama.id)
                if (r === 'login') window.location.href = '/login'
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.45rem',
                background: inList ? 'rgba(255,217,61,.15)' : 'rgba(255,255,255,.08)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${inList ? 'rgba(255,217,61,.5)' : 'rgba(255,255,255,.18)'}`,
                color: inList ? 'var(--rs-accent)' : '#fff',
                fontWeight: 700,
                fontSize: '.88rem',
                padding: '.7rem 1.3rem',
                borderRadius: 50,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background .2s, border-color .2s, color .2s',
              }}
            >
              <Plus size={16} />
              Minha Lista
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.45rem',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,.25)',
                color: 'rgba(255,255,255,.75)',
                fontWeight: 700,
                fontSize: '.88rem',
                padding: '.7rem 1.3rem',
                borderRadius: 50,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Share2 size={16} />
              Partilhar
            </button>
          </div>
        </div>
      </div>

      {/* ══ RATING SECTION ══ */}
      <RatingSection dramaId={drama.id} dramaTitle={drama.title} />

      {/* ══ EPISODES SECTION ══ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 4% 1rem' }}>
        {/* Section header */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '.5rem',
          marginBottom: '1.1rem',
        }}>
          <h2 style={{
            fontFamily: 'var(--rs-font-display)',
            fontWeight: 900,
            fontSize: 'clamp(1.1rem,2.5vw,1.4rem)',
            letterSpacing: '-.01em',
          }}>
            Episódios
          </h2>
          <span style={{ fontSize: '.78rem', color: 'rgba(255,255,255,.45)', fontWeight: 600 }}>
            {freeCount} grátis · restantes {EPISODE_COST} pts cada
          </span>
        </div>

        {/* Episode grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '.8rem',
        }}>
          {episodes.map((ep, i) => {
            const epKey = ep.id ? `${drama.id}_${ep.id}` : null
            const realUrl = ep.url || (epKey ? resolvedUrls[epKey] : undefined)
            const videoUrl = realUrl ? hdUrl(realUrl) : undefined
            return (
              <EpisodeCard
                key={ep.id ?? i}
                ep={ep}
                idx={i}
                dramaId={drama.id}
                isUnlocked={isUnlocked(ep, i)}
                onClick={() => router.push(`/feed?id=${drama.id}&ep=${i}&_n=${Date.now()}`)}
                videoUrl={videoUrl}
                downloaded={epKey ? isDownloaded(epKey) : false}
                downloading={epKey ? isDownloading(epKey) : false}
                onDownload={epKey && videoUrl ? () => download({
                  url: videoUrl, key: epKey,
                  title: ep.title, dramaTitle: drama.title,
                  dramaId: drama.id, episodeIdx: i,
                }) : undefined}
                onDeleteDownload={epKey ? () => removeDownload(epKey) : undefined}
              />
            )
          })}
        </div>
      </section>

      {/* ══ SIMILAR SERIES ══ */}
      {similar.length > 0 && (
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 4% 3rem' }}>
          <h2 style={{
            fontFamily: 'var(--rs-font-display)',
            fontWeight: 900,
            fontSize: 'clamp(1.1rem,2.5vw,1.4rem)',
            letterSpacing: '-.01em',
            marginBottom: '1.1rem',
          }}>
            Mais {GENRE_LABELS[drama.genre]}
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '1rem',
          }}>
            {similar.map(d => (
              <SimilarCard key={d.id} drama={d} />
            ))}
          </div>
        </section>
      )}

      <BottomNav />

      {toast && (
        <div style={{ position:'fixed', bottom:'5rem', left:'50%', transform:'translateX(-50%)', background:'rgba(20,20,20,.97)', border:'1px solid rgba(255,255,255,.1)', borderRadius:50, padding:'.65rem 1.4rem', color:'#fff', fontSize:'var(--rs-body-sm)', fontWeight:600, boxShadow:'var(--rs-shadow-lg)', zIndex:999, whiteSpace:'nowrap', pointerEvents:'none' }}>
          {toast}
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

/* ── Dot separator ── */
function Dot() {
  return (
    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.35)', display: 'inline-block', verticalAlign: 'middle' }} />
  )
}

/* ── Episode card ── */
interface EpisodeCardProps {
  ep: EpisodeWithId
  idx: number
  dramaId: string
  isUnlocked: boolean
  onClick: () => void
  videoUrl?: string
  downloaded?: boolean
  downloading?: boolean
  onDownload?: () => void
  onDeleteDownload?: () => void
}

function EpisodeCard({ ep, idx, isUnlocked: unlocked, onClick, videoUrl, downloaded, downloading, onDownload, onDeleteDownload }: EpisodeCardProps) {
  const [hov, setHov] = useState(false)
  const thumb = episodeThumb(ep)
  const showDl = unlocked && !!videoUrl

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '.85rem',
        padding: '.75rem',
        borderRadius: 12,
        background: hov ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.03)',
        border: `1px solid ${hov ? 'var(--rs-primary)' : 'rgba(255,255,255,.06)'}`,
        cursor: 'pointer',
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'background .18s, border-color .18s, transform .18s, box-shadow .18s',
        boxShadow: hov ? '0 8px 24px rgba(0,0,0,.35)' : 'none',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: 72,
        height: 96,
        borderRadius: 8,
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
      }}>
        {thumb ? (
          <img src={thumb} alt={ep.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--rs-poster-romance)' }} />
        )}
        {/* lock overlay */}
        {!unlocked && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Lock size={16} color="rgba(255,255,255,.7)" />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '.62rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.6px',
          color: 'rgba(255,255,255,.35)',
          marginBottom: '.2rem',
        }}>
          Episódio {idx + 1}
        </div>
        <div style={{
          fontSize: '.88rem',
          fontWeight: 700,
          lineHeight: 1.3,
          color: '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '.35rem',
        }}>
          {ep.title}
        </div>
        <div style={{
          fontSize: '.72rem',
          fontWeight: 700,
          color: ep.free || idx === 0 ? '#22c55e' : unlocked ? 'rgba(255,255,255,.4)' : 'var(--rs-accent)',
        }}>
          {ep.free || idx === 0 ? 'Grátis' : unlocked ? 'Desbloqueado' : `${EPISODE_COST} pontos`}
        </div>
      </div>

      {/* Download button — only for unlocked episodes with a Cloudinary video */}
      {showDl && (
        <button
          onClick={e => {
            e.stopPropagation()
            downloaded ? onDeleteDownload?.() : onDownload?.()
          }}
          title={downloading ? 'A transferir…' : downloaded ? 'Eliminar download' : 'Transferir para offline'}
          style={{
            flexShrink: 0, width: 34, height: 34, borderRadius: '50%',
            background: downloaded ? 'rgba(255,56,92,.15)' : 'rgba(255,255,255,.08)',
            border: `1px solid ${downloaded ? 'rgba(255,56,92,.4)' : 'rgba(255,255,255,.15)'}`,
            color: downloaded ? 'var(--rs-primary)' : 'rgba(255,255,255,.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'background .2s, border-color .2s',
          }}
        >
          {downloading
            ? <Loader2 size={14} style={{ animation: 'spin .9s linear infinite' }}/>
            : downloaded
              ? <Trash2 size={14}/>
              : <Download size={14}/>
          }
        </button>
      )}
    </div>
  )
}

/* ── Similar drama card ── */
function SimilarCard({ drama }: { drama: typeof DRAMAS[0] }) {
  const [hov, setHov] = useState(false)
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(`/detalhe/${drama.id}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        aspectRatio: '2/3',
        borderRadius: 12,
        overflow: 'hidden',
        background: drama.posterGrad ?? 'var(--rs-poster-romance)',
        position: 'relative',
        cursor: 'pointer',
        border: `2px solid ${hov ? 'var(--rs-primary)' : 'transparent'}`,
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'border-color .2s, transform .2s, box-shadow .2s',
        boxShadow: hov ? '0 12px 32px rgba(0,0,0,.55)' : 'none',
      }}
    >
      {/* Gradient bottom overlay */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: '60%',
        background: 'linear-gradient(to top, rgba(0,0,0,.88) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Icon bg */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -60%)',
        fontSize: '2.4rem',
        opacity: .45,
        pointerEvents: 'none',
      }}>
        {!(drama as any).posterImage && <span dangerouslySetInnerHTML={{ __html: drama.icon }} />}
      </div>
      {(drama as any).posterImage && (
        <img src={cld((drama as any).posterImage, 400)} alt={drama.title} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} loading="lazy"/>
      )}

      {/* Badge */}
      {drama.badge && (
        <div style={{
          position: 'absolute',
          top: 8, left: 8,
          fontSize: '.55rem',
          fontWeight: 800,
          padding: '.18rem .45rem',
          borderRadius: 4,
          textTransform: 'uppercase',
          letterSpacing: '.4px',
          ...BADGE_STYLE[drama.badge],
        }}>
          {drama.badge}
        </div>
      )}

      {/* Title overlay */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: '.6rem .7rem',
        zIndex: 2,
      }}>
        <div style={{
          fontFamily: 'var(--rs-font-display)',
          fontWeight: 900,
          fontSize: '.82rem',
          lineHeight: 1.2,
          color: '#fff',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        } as React.CSSProperties}>
          {drama.title}
        </div>
        <div style={{
          fontSize: '.62rem',
          color: 'var(--rs-accent)',
          fontWeight: 700,
          marginTop: '.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '.3rem',
        }}>
          <Star size={9} fill="currentColor" />
          {drama.rating}
          <Eye size={9} style={{ marginLeft: 3 }} />
          {fmtViews(drama.views)}
        </div>
      </div>
    </div>
  )
}

