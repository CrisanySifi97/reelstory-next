'use client'
import type { Drama } from '@/types'
import { cld } from '@/lib/cloudinary'

const GRAIN = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="3"/>
    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .35 0"/></filter>
    <rect width="100%" height="100%" filter="url(#n)"/>
  </svg>`
)

function posterLayout(id: string | number) {
  const LAYOUTS = [
    { at:'top-left',  textAlign:'left'   as const },
    { at:'bottom',    textAlign:'left'   as const },
    { at:'top-right', textAlign:'right'  as const },
    { at:'center',    textAlign:'center' as const },
  ]
  // For numeric IDs use modulo; for Firestore string IDs use char code sum
  const n = typeof id === 'number' ? id
    : /^\d+$/.test(String(id)) ? Number(id)
    : String(id).split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return LAYOUTS[Math.abs(n) % 4]
}

function duotone(genre: string) {
  const m: Record<string,string> = {
    romance:     'radial-gradient(ellipse 80% 60% at 30% 20%, rgba(255,180,200,.25), transparent 70%)',
    corporativo: 'radial-gradient(ellipse 70% 60% at 80% 30%, rgba(180,200,255,.22), transparent 70%)',
    suspense:    'radial-gradient(ellipse 60% 70% at 60% 80%, rgba(255,200,140,.18), transparent 70%)',
    comedia:     'radial-gradient(ellipse 80% 60% at 50% 10%, rgba(255,255,200,.22), transparent 70%)',
    terror:      'radial-gradient(ellipse 60% 80% at 30% 80%, rgba(140,40,80,.35),  transparent 70%)',
    acao:        'radial-gradient(ellipse 90% 50% at 50% 90%, rgba(255,80,40,.25),  transparent 70%)',
  }
  return m[genre] || 'none'
}

export type PosterSize = 'card' | 'grid' | 'hero' | 'feed'

interface Props {
  drama: Drama & { icon?: string }
  size?: PosterSize
  showInfo?: boolean
  style?: React.CSSProperties
}

export default function Poster({ drama, size = 'card', showInfo = true, style = {} }: Props) {
  const layout = posterLayout(drama.id)

  const titleSize = size === 'feed' ? 'clamp(2.5rem,11cqi,5.5rem)'
    : size === 'hero' ? 'clamp(2rem,9cqi,4.2rem)'
    : size === 'grid' ? 'clamp(1.1rem,7.5cqi,1.9rem)'
    : 'clamp(.9rem,6.2cqi,1.6rem)'

  const pos: React.CSSProperties =
    layout.at === 'top-left'  ? { top:'10%',  left:'8%', right:'8%' } :
    layout.at === 'bottom'    ? { left:'8%', right:'8%', bottom:'18%' } :
    layout.at === 'top-right' ? { top:'10%', right:'8%', left:'30%' } :
                                 { top:'50%', left:'10%', right:'10%', transform:'translateY(-50%)' }

  const imgWidth = size === 'hero' || size === 'feed' ? 800 : 400
  const img = cld((drama as any).posterImage as string | undefined, imgWidth)

  return (
    <div style={{ position:'relative', width:'100%', height:'100%', background: drama.posterGrad||'var(--rs-poster-romance)', overflow:'hidden', containerType:'inline-size', ...style }}>
      {/* Real poster image if available */}
      {img && <img src={img} alt={drama.title} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} loading="lazy" />}
      {!img && <div style={{ position:'absolute', inset:0, background: duotone(drama.genre), mixBlendMode:'screen' as React.CSSProperties['mixBlendMode'] }}/>}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(0,0,0,.35) 0%, transparent 30%, transparent 60%, rgba(0,0,0,.85) 100%)' }}/>

      {/* Title embedded in poster art */}
      <div style={{ position:'absolute', ...pos, textAlign: layout.textAlign, pointerEvents:'none' }}>
        <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:titleSize, lineHeight:.92, letterSpacing:'-.01em', color:'#fff', textShadow:'0 2px 24px rgba(0,0,0,.45)' }}>
          {drama.title}
        </div>
      </div>

      {/* Vertical accent bar on top-right layout */}
      {layout.at === 'top-right' && (
        <div style={{ position:'absolute', left:'8%', top:'10%', bottom:'20%', width:3, background:'var(--rs-primary)', borderRadius:2 }}/>
      )}

      {/* Bottom strip */}
      {showInfo && size !== 'card' && (
        <div style={{ position:'absolute', left:'8%', right:'8%', bottom:'6%', display:'flex', alignItems:'center', gap:'.7em', fontSize:'clamp(.55rem,2.2cqi,.8rem)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'rgba(255,255,255,.75)' }}>
          <span>{drama.genre}</span>
          <span style={{ width:3, height:3, background:'currentColor', borderRadius:'50%' }}/>
          <span style={{ color:'var(--rs-accent)' }}>★ {drama.rating}</span>
        </div>
      )}

      {/* Film grain */}
      <div style={{ position:'absolute', inset:0, backgroundImage:`url("${GRAIN}")`, opacity:.35, mixBlendMode:'overlay' as React.CSSProperties['mixBlendMode'], pointerEvents:'none' }}/>
    </div>
  )
}
