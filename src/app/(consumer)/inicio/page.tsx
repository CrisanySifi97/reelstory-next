'use client'
import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Play, Plus, ChevronLeft, ChevronRight, BookmarkCheck } from 'lucide-react'
import Nav from '@/components/layout/Nav'
import BottomNav from '@/components/layout/BottomNav'
import Footer from '@/components/layout/Footer'
import { DRAMAS, BADGE_STYLE } from '@/lib/mock'
import type { Drama } from '@/types'
import { useMyList } from '@/lib/useMyList'
import { useDramas } from '@/lib/useDramas'

const CONTINUE_PROGRESS = [65, 30, 80, 15, 50, 90]

function DramaCard({ drama, size = 'normal', rank, progress, onClick, onToast, onList, inList }: {
  drama: Drama & { icon: string }
  size?: 'normal' | 'top10' | 'continue'
  rank?: number; progress?: number
  onClick?: () => void; onToast?: (msg: string) => void
  onList?: () => void; inList?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const width = size === 'top10' ? 200 : size === 'continue' ? 220 : 150
  const aspectRatio = size === 'continue' ? '16/9' : '2/3'
  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onClick={onClick}
      style={{ flexShrink:0, width, borderRadius:8, overflow:'hidden', cursor:'pointer', position:'relative',
        transform: hovered ? 'scale(1.18) translateY(-8px)' : 'scale(1) translateY(0)',
        transition: 'transform .3s cubic-bezier(.4,0,.2,1)',
        zIndex: hovered ? 20 : 1, boxShadow: hovered ? '0 20px 50px rgba(0,0,0,.7)' : 'none' }}>
      <div style={{ aspectRatio, background: drama.posterGrad||'var(--rs-poster-romance)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem', position:'relative', overflow:'hidden' }}>
        {(drama as any).posterImage
          ? <img src={(drama as any).posterImage} alt={drama.title} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} loading="lazy"/>
          : <span dangerouslySetInnerHTML={{ __html: drama.icon }}/>
        }
        {drama.badge && <div style={{ position:'absolute', top:6, left:6, fontSize:'.58rem', fontWeight:700, padding:'.18rem .45rem', borderRadius:4, textTransform:'uppercase', letterSpacing:'.5px', ...BADGE_STYLE[drama.badge] }}>{drama.badge}</div>}
        {rank && <div style={{ position:'absolute', left:-18, bottom:-10, zIndex:1, fontFamily:'var(--rs-font-display)', fontSize:'7rem', fontWeight:900, lineHeight:1, color:'transparent', WebkitTextStroke:'3px rgba(255,255,255,.2)', userSelect:'none', pointerEvents:'none' }}>{rank}</div>}
        {progress !== undefined && <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:'rgba(255,255,255,.2)' }}><div style={{ height:'100%', width:`${progress}%`, background:'var(--rs-grad-hero)' }}/></div>}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.9) 0%, transparent 55%)', opacity: hovered?1:0, transition:'opacity .3s' }}/>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'.6rem', opacity: hovered?1:0, transition:'opacity .3s' }}>
          <div style={{ display:'flex', gap:'.4rem', marginBottom:'.4rem' }}>
            <button onClick={e=>{e.stopPropagation();window.location.href=`/feed?id=${drama.id}`}} style={{ width:28,height:28,borderRadius:'50%',background:'#fff',color:'#000',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}><Play size={12} fill="#000"/></button>
            <button onClick={e=>{e.stopPropagation();onList?.()}} style={{ width:28,height:28,borderRadius:'50%',background: inList ? 'var(--rs-primary)' : 'rgba(20,20,20,.7)',border:'1.5px solid rgba(255,255,255,.7)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
              {inList ? <BookmarkCheck size={12}/> : <Plus size={12}/>}
            </button>
          </div>
          <div style={{ fontSize:'.68rem',fontWeight:700,lineHeight:1.3,marginBottom:'.2rem' }}>{drama.title}</div>
          <div style={{ fontSize:'.58rem',color:'rgba(255,255,255,.6)' }}>{drama.rating} estrelas · {drama.genre}</div>
        </div>
      </div>
    </div>
  )
}

function Row({ title, items, cardFn }: { title:string; items:typeof DRAMAS; cardFn:(d:typeof DRAMAS[0],i:number)=>React.ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null)
  if (!items.length) return null
  const scroll = (dir:number) => trackRef.current?.scrollBy({ left:dir*500, behavior:'smooth' })
  return (
    <div style={{ marginBottom:'2.5rem' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 4%',marginBottom:'.9rem' }}>
        <h2 style={{ fontFamily:'var(--rs-font-display)',fontWeight:900,fontSize:'1.1rem' }}>{title}</h2>
        <Link href="/explorar" style={{ fontSize:'var(--rs-body-xs)',color:'var(--rs-primary)',fontWeight:700 }}>Ver tudo</Link>
      </div>
      <div style={{ position:'relative' }}>
        <button onClick={()=>scroll(-1)} className="row-arrow" style={{ position:'absolute',top:'50%',transform:'translateY(-50%)',left:0,background:'rgba(20,20,20,.8)',border:'none',color:'#fff',width:44,height:80,borderRadius:'0 4px 4px 0',cursor:'pointer',zIndex:10,display:'flex',alignItems:'center',justifyContent:'center' }}><ChevronLeft size={20}/></button>
        <div ref={trackRef} style={{ display:'flex',gap:8,overflowX:'auto',padding:'10px 4% 16px',scrollbarWidth:'none' }}>{items.map((d,i)=>cardFn(d,i))}</div>
        <button onClick={()=>scroll(1)} className="row-arrow" style={{ position:'absolute',top:'50%',transform:'translateY(-50%)',right:0,background:'rgba(20,20,20,.8)',border:'none',color:'#fff',width:44,height:80,borderRadius:'4px 0 0 4px',cursor:'pointer',zIndex:10,display:'flex',alignItems:'center',justifyContent:'center' }}><ChevronRight size={20}/></button>
      </div>
    </div>
  )
}

export default function InicioPage() {
  const router = useRouter()
  const { dramas: LIVE_DRAMAS, loading: dramasLoading } = useDramas()
  const [hero, setHero] = useState<any>(null)
  const [toast, setToast] = useState('')
  // loaded = true only after Firestore responds (no more mock flash)
  const loaded = !dramasLoading && LIVE_DRAMAS.length > 0
  const { toggle, isInList } = useMyList()
  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(''),2500) }

  const handleList = async (dramaId: string) => {
    const result = await toggle(dramaId)
    if (result === 'login') { window.location.href = '/login'; return }
    showToast(result === 'added' ? 'Adicionado à lista!' : 'Removido da lista')
  }


  // Set hero from live dramas once loaded
  useEffect(() => {
    if (!dramasLoading && LIVE_DRAMAS.length > 0) {
      const top = [...LIVE_DRAMAS].sort((a,b) => b.rating - a.rating)
      setHero(top[0] as any)
    }
  }, [dramasLoading, LIVE_DRAMAS])

  // Auto-rotate hero through top-rated dramas
  useEffect(() => {
    if (LIVE_DRAMAS.length === 0) return
    const top = [...LIVE_DRAMAS].sort((a,b) => b.rating - a.rating).slice(0, 5)
    let i = 0
    const t = setInterval(() => { i = (i + 1) % top.length; setHero(top[i] as any); setDescExpanded(false) }, 7000)
    return () => clearInterval(t)
  }, [LIVE_DRAMAS])

  const byGenre = (g:string) => LIVE_DRAMAS.filter(d=>d.genre===g)
  const top10   = [...LIVE_DRAMAS].sort((a,b)=>b.rating-a.rating).slice(0,10)
  const novos   = LIVE_DRAMAS.filter(d=>d.badge==='NOVO'||d.badge==='HOT')

  const [descExpanded, setDescExpanded] = React.useState(false)

  const heroBanner = hero ? (hero as any).bannerImage as string | undefined : undefined

  return (
    <div style={{ background:'var(--rs-bg-warm)', minHeight:'100dvh', fontFamily:'var(--rs-font-body)', color:'#fff' }}>
      <Nav transparent activeLink="/inicio"/>
      <section style={{ height:'92vh',minHeight:560,position:'relative',display:'flex',alignItems:'flex-end',padding:'0 4% 5rem',overflow:'hidden', background:'linear-gradient(135deg,#1a0533 0%,#2d1b69 40%,#141414 100%)' }}>
        {/* Banner image — fades in per hero, key forces remount on change */}
        {heroBanner && (
          <img key={heroBanner} src={heroBanner} alt="" style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center',animation:'heroBannerIn .6s ease forwards' }}/>
        )}
        {/* Clickable background area → detalhe */}
        <div onClick={()=>hero && router.push(`/detalhe?id=${hero.id}`)} style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'flex-end',cursor: hero ? 'pointer' : 'default' }}>
          <div style={{ position:'absolute',inset:0,background:`linear-gradient(to right, rgba(20,20,20,${heroBanner?'.9':'1'}) 30%, rgba(20,20,20,.5) 70%, rgba(20,20,20,.1) 100%), linear-gradient(to top, rgba(20,20,20,1) 0%, transparent 50%)` }}/>
          {hero && <div style={{ fontSize:'clamp(180px,28vw,340px)',opacity:.18,marginRight:'4%',filter:'drop-shadow(0 0 80px rgba(255,56,92,.4))',userSelect:'none',lineHeight:1 }} dangerouslySetInnerHTML={{ __html: hero.icon }}/>}
        </div>
        <div style={{ position:'relative',zIndex:1,maxWidth:580 }}>
          {hero ? (<>
          {hero.badge && <span style={{ ...BADGE_STYLE[hero.badge],fontSize:'.68rem',fontWeight:700,padding:'.25rem .7rem',borderRadius:4,textTransform:'uppercase',letterSpacing:'.8px',display:'inline-block',marginBottom:'.75rem' }}>{hero.badge}</span>}
          <h1 onClick={()=>router.push(`/detalhe?id=${hero.id}`)} style={{ fontFamily:'var(--rs-font-display)',fontWeight:900,fontSize:'clamp(1.8rem,3.5vw,3rem)',lineHeight:1.05,marginBottom:'.7rem',textShadow:'0 2px 20px rgba(0,0,0,.5)',cursor:'pointer' }}>{hero.title}</h1>
          <div style={{ marginBottom:'1rem', maxWidth:480 }}>
            <p style={{ color:'rgba(255,255,255,.8)',fontSize:'.95rem',lineHeight:1.65,margin:0,
              ...(!descExpanded ? { display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' as any, overflow:'hidden' } : {}),
            }}>{hero.description}</p>
            {hero.description && hero.description.length > 120 && (
              <button onClick={e=>{e.stopPropagation();setDescExpanded(v=>!v)}} style={{ background:'none',border:'none',color:'var(--rs-primary)',fontSize:'.85rem',fontWeight:700,cursor:'pointer',padding:'4px 0 0',display:'block' }}>
                {descExpanded ? 'Ver menos ▲' : 'Ver mais ▼'}
              </button>
            )}
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1.8rem',fontSize:'var(--rs-body-sm)',color:'var(--rs-text-muted)' }}>
            <span style={{ color:'var(--rs-accent)',fontFamily:'var(--rs-font-display)',fontWeight:900 }}>{hero.rating}</span>
            <span style={{ width:4,height:4,borderRadius:'50%',background:'currentColor',display:'inline-block' }}/>
            <span>{hero.episodes.length} episódios</span>
            <span style={{ width:4,height:4,borderRadius:'50%',background:'currentColor',display:'inline-block' }}/>
            <span style={{ textTransform:'capitalize' }}>{hero.genre}</span>
          </div>
          <div style={{ display:'flex',gap:'.8rem',flexWrap:'wrap' }}>
            <Link href={`/detalhe?id=${hero.id}`} style={{ display:'inline-flex',alignItems:'center',gap:'.5rem',background:'#fff',color:'#000',padding:'.75rem 1.8rem',borderRadius:8,fontSize:'1rem',fontWeight:700,textDecoration:'none' }}>
              <Play size={18} fill="#000"/> Ver Detalhes
            </Link>
            <button onClick={() => handleList(hero.id)} style={{ display:'inline-flex',alignItems:'center',gap:'.5rem',background:'rgba(109,109,110,.7)',color:'#fff',border:'none',padding:'.75rem 1.8rem',borderRadius:8,fontSize:'1rem',fontWeight:700,cursor:'pointer' }}>
              {isInList(hero.id) ? <><BookmarkCheck size={18}/> Na lista</> : <><Plus size={18}/> Minha Lista</>}
            </button>
          </div>
          {/* Hero indicator dots — use live dramas */}
          <div style={{ display:'flex',gap:5,marginTop:'1.2rem' }}>
            {[...LIVE_DRAMAS].sort((a,b)=>b.rating-a.rating).slice(0,5).map(d=>(
              <div key={d.id} onClick={e=>{e.stopPropagation();setHero(d as any);setDescExpanded(false)}} style={{ width:d.id===hero.id?20:6,height:6,borderRadius:3,background:d.id===hero.id?'var(--rs-primary)':'rgba(255,255,255,.3)',cursor:'pointer',transition:'width .3s,background .3s' }}/>
            ))}
          </div>
          </>) : (
            /* Skeleton while loading */
            <div>
              <div className="rs-shimmer" style={{ width:280,height:36,borderRadius:6,marginBottom:'1rem' }}/>
              <div className="rs-shimmer" style={{ width:420,height:14,borderRadius:6,marginBottom:8 }}/>
              <div className="rs-shimmer" style={{ width:360,height:14,borderRadius:6,marginBottom:8 }}/>
              <div className="rs-shimmer" style={{ width:300,height:14,borderRadius:6,marginBottom:'1.8rem' }}/>
              <div style={{ display:'flex',gap:'.8rem' }}>
                <div className="rs-shimmer" style={{ width:160,height:48,borderRadius:8 }}/>
                <div className="rs-shimmer" style={{ width:160,height:48,borderRadius:8 }}/>
              </div>
            </div>
          )}
        </div>
      </section>
      <div style={{ paddingBottom:'5rem' }}>
        {!loaded && <>{Array.from({length:3},(_,i)=>(
          <div key={i} style={{ marginBottom:'2.5rem' }}>
            <div className="rs-shimmer" style={{ width:180,height:18,marginBottom:14,marginLeft:'4%' }}/>
            <div style={{ display:'flex',gap:8,padding:'4px 4%',overflow:'hidden' }}>
              {Array.from({length:6},(_,j)=>(
                <div key={j} style={{ flexShrink:0,width:130 }}>
                  <div className="rs-shimmer" style={{ aspectRatio:'2/3',borderRadius:8,marginBottom:10 }}/>
                  <div className="rs-shimmer" style={{ height:10,borderRadius:6,marginBottom:6 }}/>
                  <div className="rs-shimmer" style={{ height:8,borderRadius:6,width:'55%' }}/>
                </div>
              ))}
            </div>
          </div>
        ))}</>}
        <div style={{ opacity: loaded?1:0, transition:'opacity .4s' }}>
          <Row title="Continuar a Ver" items={LIVE_DRAMAS.slice(0,6)} cardFn={(d,i)=><DramaCard key={d.id} drama={d} size="continue" progress={CONTINUE_PROGRESS[i]} onClick={()=>router.push(`/detalhe?id=${d.id}`)} onToast={showToast} onList={()=>handleList(d.id)} inList={isInList(d.id)}/>}/>
          <Row title="Top 10 Angola" items={top10} cardFn={(d,i)=><DramaCard key={d.id} drama={d} size="top10" rank={i+1} onClick={()=>router.push(`/detalhe?id=${d.id}`)} onToast={showToast} onList={()=>handleList(d.id)} inList={isInList(d.id)}/>}/>
          <Row title="Novos Episódios" items={novos} cardFn={(d)=><DramaCard key={d.id} drama={d} onClick={()=>router.push(`/detalhe?id=${d.id}`)} onToast={showToast} onList={()=>handleList(d.id)} inList={isInList(d.id)}/>}/>
          {(['romance','corporativo','suspense','acao','comedia','terror'] as const).map(g=>(
            <Row key={g} title={({romance:'Romance',corporativo:'Corporativo',suspense:'Suspense',acao:'Acção',comedia:'Comédia',terror:'Terror'})[g]} items={byGenre(g)} cardFn={(d)=><DramaCard key={d.id} drama={d} onClick={()=>router.push(`/detalhe?id=${d.id}`)} onToast={showToast} onList={()=>handleList(d.id)} inList={isInList(d.id)}/>}/>
          ))}
        </div>
      </div>
      {toast && <div style={{ position:'fixed',bottom:'5rem',left:'50%',transform:'translateX(-50%)',background:'rgba(20,20,20,.97)',border:'1px solid rgba(255,255,255,.1)',borderRadius:50,padding:'.65rem 1.4rem',color:'#fff',fontSize:'var(--rs-body-sm)',fontWeight:600,boxShadow:'var(--rs-shadow-lg)',zIndex:999,whiteSpace:'nowrap',pointerEvents:'none' }}>{toast}</div>}
      <Footer /><BottomNav/>
      <style>{`
        @media(max-width:768px){.row-arrow{display:none!important;}}
        @keyframes heroBannerIn { from { opacity:0 } to { opacity:1 } }
      `}</style>
    </div>
  )
}
