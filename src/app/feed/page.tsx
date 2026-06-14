'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Heart, Bookmark,
  Share2, ChevronUp, Coins, Volume2, VolumeX, AlertCircle,
} from 'lucide-react'
import { auth, db } from '@/lib/firebase'
import {
  doc, getDoc, setDoc, updateDoc,
  arrayUnion, arrayRemove, increment,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { useDrama } from '@/lib/useDramas'
import { useMyList } from '@/lib/useMyList'
import Poster from '@/components/Poster'
import type { Episode } from '@/types'

const EPISODE_COST = 10
type EpisodeWithId = Episode & { id: string }

/** Adds Cloudinary quality/format transformation to a video URL */
function hdUrl(url?: string): string {
  if (!url) return ''
  // q_auto picks a bitrate based on content/network instead of forcing top quality,
  // f_auto serves a smaller codec (e.g. webm/h265) when the browser supports it —
  // q_auto:best was producing very heavy files that stalled on mobile data.
  return url.replace('/upload/', '/upload/q_auto,f_auto/')
}

function fmtViews(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

/* ── No-points bottom sheet ── */
function NoPointsSheet() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 540, margin: '0 auto', background: 'linear-gradient(180deg,#1a1a2e 0%,#0e0e18 100%)', borderRadius: '24px 24px 0 0', padding: '1.8rem 1.6rem calc(env(safe-area-inset-bottom,0px) + 2rem)', border: '1px solid rgba(255,255,255,.08)', borderBottom: 'none' }}>
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 2, margin: '0 auto 1.4rem' }} />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,217,61,.12)', border: '1px solid rgba(255,217,61,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={26} color="var(--rs-accent)" />
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <div style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.15rem', marginBottom: '.4rem' }}>Pontos Esgotados</div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '.88rem', lineHeight: 1.6 }}>Já não tens pontos suficientes para continuar a assistir.<br/>Compra mais pontos e continua de onde paraste.</div>
        </div>
        <Link href="/pontos" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '1rem 1.2rem', borderRadius: 14, border: '2px solid var(--rs-primary)', background: 'rgba(255,56,92,.12)', color: '#fff', fontSize: '.95rem', fontWeight: 700, marginBottom: '.75rem', textDecoration: 'none' }}>
          <span>Comprar Pontos</span>
          <span style={{ color: 'var(--rs-accent)', fontWeight: 800 }}>Ver pacotes →</span>
        </Link>
        <button onClick={() => window.history.back()} style={{ width: '100%', padding: '.75rem', background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', fontSize: '.88rem', fontWeight: 600, cursor: 'pointer' }}>← Voltar às séries</button>
      </div>
    </div>
  )
}

/* ── Right action rail button ── */
function RailButton({ icon, label, active, pulse, onClick }: { icon: React.ReactNode; label: string; active?: boolean; pulse?: boolean; onClick?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={onClick}>
      <button style={{ width: 46, height: 46, borderRadius: '50%', background: active ? 'var(--rs-primary)' : 'rgba(255,255,255,.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', transition: 'background .2s' }}>
        <span style={{ display: 'flex', animation: pulse ? 'rs-like-pop .4s ease' : undefined }}>{icon}</span>
      </button>
      <span style={{ fontSize: '.64rem', fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.8)' }}>{label}</span>
    </div>
  )
}

/* ── Main feed ── */
function FeedContent() {
  const params   = useSearchParams()
  const router   = useRouter()
  const dramaId  = params.get('id') ?? '1'
  const startEp  = Number(params.get('ep') ?? 0)

  const { drama, loading: dramaLoading } = useDrama(dramaId)
  const episodes = (drama?.episodes ?? []) as EpisodeWithId[]

  const { toggle: toggleList, isInList } = useMyList()

  // playback
  const [currentIdx, setCurrentIdx]     = useState(startEp)
  const [playing, setPlaying]           = useState(true)
  const [muted, setMuted]               = useState(true)
  const [tapIcon, setTapIcon]           = useState<'play'|'pause'|null>(null)
  const [progress, setProgress]         = useState(0)
  const [currentTime, setCurrentTime]   = useState('0:00')
  const [totalTime, setTotalTime]       = useState('0:00')
  const seekBarRef = useRef<HTMLDivElement>(null)

  // auth / user data
  const [uid, setUid]                   = useState<string | null>(null)
  const [coins, setCoins]               = useState(0)
  const [unlocked, setUnlocked]         = useState<Set<string>>(new Set())
  const [likedEps, setLikedEps]         = useState<Set<string>>(new Set())
  const [stats, setStats]               = useState<Record<string, { likes: number }>>({})
  const [likePulseKey, setLikePulseKey] = useState<string | null>(null)

  // ui
  const [toast, setToast]               = useState('')
  const [showNoPoints, setShowNoPoints] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const progRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)

  const fmtTime = (s: number) => {
    const t = Math.floor(s || 0)
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
  }

  const seekTo = (pct: number) => {
    const v = videoRef.current
    if (!v || !v.duration) return
    v.currentTime = Math.max(0, Math.min(pct, 1)) * v.duration
  }

  const handleSeekBarInteraction = (e: React.MouseEvent) => {
    const bar = seekBarRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1))
    seekTo(pct)
  }

  /* ── Video playback ── */
  // Browsers block autoplay-with-sound outside a direct user gesture (e.g. after
  // scrolling to a new episode), and will pause an autoplaying video again if it's
  // unmuted programmatically. Stay muted until the user taps the sound button.
  const tryPlay = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.play().catch(() => {})
  }

  const handleTap = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); setTapIcon('play') }
    else          { v.pause();                setPlaying(false); setTapIcon('pause') }
    setTimeout(() => setTapIcon(null), 600)
  }

  /* ── Firebase auth + user data ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) return
      setUid(user.uid)
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists()) {
          const d = snap.data()
          setCoins(d.coins ?? 0)
          setUnlocked(new Set(d.unlockedEpisodes ?? []))
          setLikedEps(new Set(d.likedEpisodes ?? []))
        }
      } catch { /* silent */ }
    })
    return unsub
  }, [])

  /* ── Progress bar + state reset on episode change ── */
  useEffect(() => {
    if (progRef.current) clearInterval(progRef.current)
    setProgress(0)
    setCurrentTime('0:00')
    setTotalTime('0:00')
    setPlaying(true)
    setMuted(true)
    const ep = episodes[currentIdx]
    const hasVideo = ep && !!(ep.url || ep.ytId)
    if (!hasVideo) {
      progRef.current = setInterval(() => {
        setProgress(p => { if (p >= 100) { clearInterval(progRef.current!); return 100 } return p + 0.25 })
      }, 90)
    }
    return () => { if (progRef.current) clearInterval(progRef.current) }
  // `unlocked` is intentional: when the user spends points to unlock the current
  // episode, this restarts the fake progress bar from 0 instead of leaving it
  // wherever it was while the "locked" placeholder was showing.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, unlocked])

  /* ── Scroll to startEp + visible-episode observer ── */
  // Uses IntersectionObserver instead of scroll+rAF math, which can miss
  // updates on momentum/snap scrolling in some mobile browsers. Scrolling to
  // startEp is done here too, once episodes are actually rendered — doing it
  // in an earlier effect (before episodes load) gets clamped back to 0.
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const targets = Array.from(container.children) as HTMLElement[]
    if (targets.length === 0) return
    if (startEp > 0) {
      container.scrollTop = startEp * container.clientHeight
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const idx = targets.indexOf(entry.target as HTMLElement)
          if (idx !== -1) setCurrentIdx(prev => (prev === idx ? prev : idx))
        }
      }
    }, { root: container, threshold: 0.5 })
    targets.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [episodes.length])

  const dramaId2 = drama?.id ?? ''
  const isUnlocked = (ep: EpisodeWithId) => ep.free || unlocked.has(`${dramaId2}_${ep.id}`)
  // Same key format as isUnlocked/the unlock-deduction logic — episodes always have an `id`
  // (assigned by the admin), so no need for an `ep.order` fallback here.
  const epKey = (ep: EpisodeWithId) => `${dramaId2}_${ep.id}`

  /* ── Load like counts for the current episode ── */
  useEffect(() => {
    const ep = episodes[currentIdx]
    if (!ep) return
    const key = epKey(ep)
    if (stats[key]) return
    getDoc(doc(db, 'episodeStats', key)).then(snap => {
      const d = snap.data()
      setStats(prev => ({ ...prev, [key]: { likes: d?.likes ?? 0 } }))
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, dramaId2])

  /* ── Auto-play / pause based on sheet state ── */
  useEffect(() => {
    if (showNoPoints) {
      videoRef.current?.pause()
    } else {
      tryPlay()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNoPoints])

  /* ── Auto-play when episode changes and is accessible ── */
  useEffect(() => {
    if (showNoPoints) return
    const v = videoRef.current
    if (v && v.paused) tryPlay()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx])

  /* ── Auto-deduct points when watching a paid episode ── */
  useEffect(() => {
    const ep = episodes[currentIdx]
    if (!ep) return
    // Episode is free or already unlocked — hide any block sheet and allow playback
    if (ep.free || isUnlocked(ep)) {
      setShowNoPoints(false)
      tryPlay()
      return
    }
    if (!uid) return
    const key = `${drama!.id}_${ep.id}`
    if (coins <= 0) {
      setShowNoPoints(true)
      return
    }
    // Has points — deduct and unlock silently
    const newCoins = Math.max(0, coins - EPISODE_COST)
    setCoins(newCoins)
    setUnlocked(prev => new Set([...prev, key]))
    setShowNoPoints(false)
    tryPlay()
    updateDoc(doc(db, 'users', uid), { coins: newCoins, unlockedEpisodes: arrayUnion(key) }).catch(() => {
      // Persist failed — roll back the optimistic unlock so the user isn't charged for nothing
      setCoins(coins)
      setUnlocked(prev => { const next = new Set(prev); next.delete(key); return next })
      setShowNoPoints(true)
      videoRef.current?.pause()
    })
  // `coins` and `drama` are read but deliberately excluded: this effect both reads
  // and writes `coins`/`unlocked`, so depending on them would re-trigger the
  // deduction on every update they cause. It re-runs on episode change, login
  // state change, or unlock-set change instead.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, uid, unlocked])

  /* ── Like episode ── */
  const toggleLikeEp = async (ep: EpisodeWithId) => {
    if (!uid) { showToast('Entra para dar like'); return }
    const key = epKey(ep)
    const isLiked = likedEps.has(key)
    const next = new Set(likedEps)
    isLiked ? next.delete(key) : next.add(key)
    setLikedEps(next)
    setStats(prev => ({
      ...prev,
      [key]: { likes: Math.max(0, (prev[key]?.likes ?? 0) + (isLiked ? -1 : 1)) },
    }))
    if (!isLiked) {
      setLikePulseKey(key)
      setTimeout(() => setLikePulseKey(null), 400)
    }
    try {
      await updateDoc(doc(db, 'users', uid), {
        likedEpisodes: isLiked ? arrayRemove(key) : arrayUnion(key),
      })
      await setDoc(doc(db, 'episodeStats', key), { likes: increment(isLiked ? -1 : 1) }, { merge: true })
    } catch {
      /* revert on error */
      setLikedEps(likedEps)
      setStats(prev => ({
        ...prev,
        [key]: { likes: Math.max(0, (prev[key]?.likes ?? 0) + (isLiked ? 1 : -1)) },
      }))
    }
  }

  /* ── Save drama to list ── */
  const handleSave = async () => {
    const r = await toggleList(drama!.id)
    if (r === 'login') { showToast('Entra para guardar'); return }
    showToast(r === 'added' ? '✓ Série guardada na lista!' : 'Removida da lista')
  }

  /* ── Share ── */
  const handleShare = async () => {
    const url = `${window.location.origin}/detalhe?id=${drama!.id}`
    if (navigator.share) {
      await navigator.share({ title: drama!.title, text: `Vê "${drama!.title}" na ReelStory`, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url).catch(() => {})
      showToast('Link copiado!')
    }
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const currentEp = episodes[currentIdx] as EpisodeWithId | undefined

  // ── Auto-hide UI after 3s ──────────────────────────────────────────────────
  const [uiVisible, setUiVisible] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetHideTimer = () => {
    setUiVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setUiVisible(false), 3000)
  }

  useEffect(() => {
    resetHideTimer()
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx])

  // Loading / not found guard
  if (dramaLoading) return (
    <div style={{ position:'fixed', inset:0, background:'#000', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'var(--rs-font-body)' }}>
      <div style={{ width:40, height:40, border:'3px solid rgba(255,255,255,.15)', borderTopColor:'var(--rs-primary)', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
    </div>
  )
  if (!drama) return (
    <div style={{ position:'fixed', inset:0, background:'#000', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem', color:'#fff', fontFamily:'var(--rs-font-body)' }}>
      <span style={{ fontSize:'2rem' }}>⚠️</span>
      <p>Série não encontrada</p>
      <button onClick={() => router.back()} style={{ background:'var(--rs-primary)', border:'none', color:'#fff', padding:'.6rem 1.4rem', borderRadius:50, cursor:'pointer', fontWeight:700 }}>Voltar</button>
    </div>
  )

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#fff', fontFamily: 'var(--rs-font-body)' }}
      onClick={resetHideTimer}
      onTouchStart={resetHideTimer}
    >

      {/* ── Top bar ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200, padding: 'calc(env(safe-area-inset-top, 12px) + 8px) 16px 12px', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,.72) 0%, transparent 100%)', pointerEvents: 'none', opacity: uiVisible ? 1 : 0, transition: 'opacity .4s ease' }}>
        <button onClick={(e) => { e.stopPropagation(); router.back() }} style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, pointerEvents: uiVisible ? 'all' : 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.65)', fontWeight: 600 }}>EP. {currentIdx + 1} / {episodes.length}</div>
        </div>
        {coins > 0 && (
          <Link href="/pontos" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', background: 'rgba(255,217,61,.15)', border: '1px solid rgba(255,217,61,.4)', borderRadius: 50, padding: '.28rem .65rem', color: 'var(--rs-accent)', fontSize: '.78rem', fontWeight: 700, textDecoration: 'none', flexShrink: 0, pointerEvents: uiVisible ? 'all' : 'none' }}>
            <Coins size={12} /> {coins.toLocaleString('pt-AO')}
          </Link>
        )}
      </div>

      {/* ── Scrollable episodes ── */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}>
        {episodes.map((ep, idx) => {
          const unlckd    = isUnlocked(ep)
          const hasVideo  = !!(ep.url || ep.ytId)
          const isCurrent = idx === currentIdx
          const isLiked   = likedEps.has(epKey(ep))
          const isSaved   = isInList(drama!.id)
          const epStats   = stats[epKey(ep)]

          return (
            <div key={ep.id ?? idx} style={{ height: '100dvh', scrollSnapAlign: 'start', scrollSnapStop: 'always', position: 'relative', overflow: 'hidden', background: '#000' }}>

              {/* ── Video or Poster ── */}
              {hasVideo && isCurrent ? (
                <>
                  {ep.url ? (
                    <video
                      ref={videoRef}
                      key={`${drama!.id}-${ep.url}-${idx}`}
                      src={hdUrl(ep.url)}
                      autoPlay
                      playsInline
                      muted={muted}
                      preload="auto"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000', zIndex: 1 }}
                      onPlay={() => setPlaying(true)}
                      onPause={() => setPlaying(false)}
                      onEnded={() => {
                        const nextIdx = currentIdx + 1
                        if (nextIdx >= episodes.length) return
                        const nextEp = episodes[nextIdx] as EpisodeWithId
                        const canWatch = nextEp.free || isUnlocked(nextEp) || coins > 0
                        if (!canWatch) {
                          setShowNoPoints(true)
                          return
                        }
                        scrollRef.current?.scrollTo({ top: nextIdx * (scrollRef.current.clientHeight), behavior: 'smooth' })
                      }}
                      onTimeUpdate={() => {
                        const v = videoRef.current
                        if (v && v.duration) {
                          setProgress((v.currentTime / v.duration) * 100)
                          setCurrentTime(fmtTime(v.currentTime))
                          setTotalTime(fmtTime(v.duration))
                        }
                      }}
                      onLoadedMetadata={() => {
                        const v = videoRef.current
                        if (v) setTotalTime(fmtTime(v.duration))
                      }}
                    />
                  ) : (
                    <iframe
                      key={`${drama!.id}-${ep.ytId}-${idx}`}
                      src={`https://www.youtube.com/embed/${ep.ytId}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${ep.ytId}&controls=0&playsinline=1&rel=0&modestbranding=1`}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', background: '#000', zIndex: 1 }}
                    />
                  )}
                  {/* Preload next episode's metadata only — preloading the full video
                      competed for bandwidth with the one actually playing and caused
                      buffering on mobile data. */}
                  {episodes[idx + 1]?.url && (
                    <video
                      key={`preload-${episodes[idx + 1].url}`}
                      src={hdUrl((episodes[idx + 1] as EpisodeWithId).url)}
                      preload="metadata"
                      muted
                      style={{ display: 'none' }}
                    />
                  )}
                  <div onClick={handleTap} style={{ position: 'absolute', inset: 0, zIndex: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {tapIcon && (
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'rs-tap-fade .6s ease forwards' }}>
                        {tapIcon === 'pause'
                          ? <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><rect x="5" y="3" width="4" height="18" rx="1"/><rect x="15" y="3" width="4" height="18" rx="1"/></svg>
                          : <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M5 3l14 9-14 9z"/></svg>}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ position: 'absolute', inset: 0 }}>
                  <Poster drama={drama} size="feed" showInfo={false} />
                </div>
              )}

              {/* Vignettes — always visible */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to bottom, rgba(0,0,0,.85) 0%, transparent 100%)', pointerEvents: 'none', zIndex: 4 }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to top, rgba(0,0,0,.9) 0%, transparent 100%)', pointerEvents: 'none', zIndex: 4 }} />

              {/* ── Right action rail ── */}
              <div style={{ position: 'absolute', right: 12, bottom: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 10, opacity: uiVisible ? 1 : 0, transition: 'opacity .4s ease', pointerEvents: uiVisible ? 'auto' : 'none' }}>
                {hasVideo && isCurrent && (
                  <RailButton
                    icon={muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    label={muted ? 'Som' : 'Mudo'}
                    active={!muted}
                    onClick={() => { const next = !muted; setMuted(next); if (videoRef.current) videoRef.current.muted = next }}
                  />
                )}
                <RailButton
                  icon={<Heart size={20} fill={isLiked ? '#fff' : 'none'} />}
                  label={epStats?.likes ? fmtViews(epStats.likes) : 'Gosto'}
                  active={isLiked}
                  pulse={likePulseKey === epKey(ep)}
                  onClick={() => toggleLikeEp(ep)}
                />
                <RailButton
                  icon={<Bookmark size={20} fill={isSaved ? '#fff' : 'none'} />}
                  label={isSaved ? 'Guardado' : 'Guardar'}
                  active={isSaved}
                  onClick={handleSave}
                />
                <RailButton
                  icon={<Share2 size={20} />}
                  label="Partilhar"
                  onClick={handleShare}
                />
              </div>

              {/* ── Bottom info ── */}
              <div style={{ position: 'absolute', left: 0, right: 70, bottom: 0, padding: '1.5rem 1rem 1.2rem', zIndex: 10, opacity: uiVisible ? 1 : 0, transition: 'opacity .4s ease', pointerEvents: 'none' }}>
                <div style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1rem', letterSpacing: '-.01em', textShadow: '0 1px 4px rgba(0,0,0,.8)', marginBottom: '.3rem' }}>{drama!.title}</div>
                <div style={{ fontSize: '.88rem', fontWeight: 600, color: 'rgba(255,255,255,.85)', marginBottom: '.4rem', lineHeight: 1.3, textShadow: '0 1px 4px rgba(0,0,0,.8)' }}>{ep.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', fontSize: '.72rem', color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>
                  <span>👁 {fmtViews(drama!.views)}</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                  <span style={{ color: 'var(--rs-accent)' }}>★ {drama!.rating}</span>
                  {ep.free && <span style={{ color: '#22c55e', fontWeight: 700 }}>· Grátis</span>}
                </div>
              </div>

              {/* ── Seek bar ── */}
              {isCurrent && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30, padding: '0 0 6px', opacity: uiVisible ? 1 : 0, transition: 'opacity .4s ease', pointerEvents: uiVisible ? 'auto' : 'none' }}>
                  {/* Time display */}
                  {hasVideo && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 14px 4px', pointerEvents: 'none' }}>
                      <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.8)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,.8)' }}>{currentTime}</span>
                      <span style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.5)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,.8)' }}>{totalTime}</span>
                    </div>
                  )}
                  {/* Bar track — touch area */}
                  <div
                    ref={hasVideo && isCurrent ? seekBarRef : undefined}
                    style={{ height: 28, display: 'flex', alignItems: 'center', padding: '0 14px', cursor: hasVideo ? 'pointer' : 'default' }}
                    onClick={hasVideo ? handleSeekBarInteraction : undefined}
                  >
                    <div style={{ position: 'relative', flex: 1, height: 3, background: 'rgba(255,255,255,.22)', borderRadius: 3 }}>
                      {/* Fill */}
                      <div style={{
                        position: 'absolute', top: 0, left: 0, height: '100%',
                        width: `${isCurrent ? progress : idx < currentIdx ? 100 : 0}%`,
                        background: hasVideo ? '#fff' : 'var(--rs-primary)',
                        borderRadius: 3,
                        transition: hasVideo ? 'none' : 'width .3s'
                      }} />
                      {/* Thumb — só no episódio actual com vídeo */}
                      {hasVideo && (
                        <div style={{
                          position: 'absolute', top: '50%', left: `${progress}%`,
                          transform: 'translate(-50%, -50%)',
                          width: 14, height: 14, borderRadius: '50%',
                          background: '#fff',
                          boxShadow: '0 0 0 2px rgba(255,255,255,.3), 0 2px 6px rgba(0,0,0,.5)',
                          transition: 'none',
                          pointerEvents: 'none'
                        }} />
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Thin bar for non-current episodes */}
              {!isCurrent && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,.12)', zIndex: 20 }}>
                  <div style={{ height: '100%', width: idx < currentIdx ? '100%' : '0%', background: 'var(--rs-primary)', borderRadius: 3 }} />
                </div>
              )}

              {/* Swipe hint */}
              {idx === 0 && isCurrent && episodes.length > 1 && (
                <div style={{ position: 'absolute', bottom: 110, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, zIndex: 10, animation: 'rs-bounce .9s ease-in-out infinite', pointerEvents: 'none' }}>
                  <ChevronUp size={22} color="rgba(255,255,255,.6)" />
                  <span style={{ fontSize: '.6rem', fontWeight: 700, color: 'rgba(255,255,255,.5)', letterSpacing: '.5px', textTransform: 'uppercase' }}>Desliza</span>
                </div>
              )}

            </div>
          )
        })}
      </div>

      {/* ── No-points sheet ── */}
      {showNoPoints && <NoPointsSheet />}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(22,33,62,.97)', border: '1px solid rgba(255,56,92,.3)', borderRadius: 50, padding: '.65rem 1.4rem', color: '#fff', fontSize: '.82rem', fontWeight: 600, boxShadow: '0 8px 30px rgba(0,0,0,.5)', zIndex: 999, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes rs-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(-8px); }
        }
        @keyframes rs-like-pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        @keyframes rs-tap-fade {
          0%   { opacity: 1; transform: scale(1); }
          60%  { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0; transform: scale(1.3); }
        }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}

export default function FeedPage() {
  return (
    <Suspense fallback={
      <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '.85rem' }}>A carregar...</div>
      </div>
    }>
      <FeedContent />
    </Suspense>
  )
}
