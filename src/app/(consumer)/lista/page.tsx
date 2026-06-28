'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bookmark, Play, Trash2, Search } from 'lucide-react'
import Nav from '@/components/layout/Nav'
import BottomNav from '@/components/layout/BottomNav'
import Footer from '@/components/layout/Footer'
import { BADGE_STYLE } from '@/lib/mock'
import { useDramas } from '@/lib/useDramas'
import { useMyList } from '@/lib/useMyList'
import { cld } from '@/lib/cloudinary'
import type { Drama } from '@/types'

type DramaWithIcon = Drama & { icon: string }

function ListCard({ drama, onRemove }: { drama: DramaWithIcon; onRemove: () => void }) {
  const [hov, setHov] = useState(false)
  const router = useRouter()
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 14, overflow: 'hidden', background: '#16213E',
        border: `2px solid ${hov ? 'var(--rs-primary)' : 'transparent'}`,
        transform: hov ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hov ? '0 20px 40px rgba(0,0,0,.5)' : 'none',
        transition: 'all .25s var(--rs-ease)',
        position: 'relative',
      }}
    >
      {/* Poster */}
      <Link href={`/detalhe/${drama.id}`} style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{
          aspectRatio: '9/14',
          background: drama.posterGrad ?? 'var(--rs-poster-romance)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.8rem', position: 'relative', overflow: 'hidden',
        }}>
          {(drama as any).posterImage
            ? <img src={cld((drama as any).posterImage, 400)} alt={drama.title} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }} loading="lazy"/>
            : <span dangerouslySetInnerHTML={{ __html: drama.icon }}/>
          }
          {drama.badge && (
            <div style={{ position:'absolute', top:8, left:8, fontSize:'.58rem', fontWeight:700, padding:'.2rem .45rem', borderRadius:4, textTransform:'uppercase', letterSpacing:'.5px', ...BADGE_STYLE[drama.badge] }}>
              {drama.badge}
            </div>
          )}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 50%)', opacity: hov ? 1 : 0, transition:'opacity .25s' }}/>
          {hov && (
            <div style={{ position:'absolute', bottom:10, left:10, right:10 }}>
              <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                <Link href={`/feed?id=${drama.id}`} onClick={e => { e.preventDefault(); e.stopPropagation(); router.push(`/feed?id=${drama.id}&_n=${Date.now()}`) }}
                  style={{ display:'flex', alignItems:'center', gap:'.3rem', background:'#fff', color:'#000', padding:'.5rem 1rem', borderRadius:8, fontSize:'.8rem', fontWeight:700, textDecoration:'none' }}>
                  <Play size={13} fill="#000"/> Assistir
                </Link>
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div style={{ padding:'.7rem .8rem .6rem' }}>
        <Link href={`/detalhe/${drama.id}`} style={{ textDecoration:'none', color:'#fff' }}>
          <div style={{ fontWeight:700, fontSize:'.88rem', lineHeight:1.3, marginBottom:'.3rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {drama.title}
          </div>
        </Link>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:'.72rem', color:'#8892A4' }}>
            {drama.episodes.length} eps · <span style={{ color:'var(--rs-accent)' }}>★ {drama.rating}</span>
          </div>
          <button
            onClick={onRemove}
            title="Remover da lista"
            style={{ background:'rgba(239,68,68,.1)', border:'none', color:'#ef4444', width:28, height:28, borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,.1)')}
          >
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ListaPage() {
  const { uid, myList, toggle, loading } = useMyList()
  const [query, setQuery]     = useState('')
  const [toast, setToast]     = useState('')
  const { dramas: allDramas }  = useDramas()

  const removeFromList = async (dramaId: string) => {
    const result = await toggle(dramaId)
    if (result === 'removed') showToast('Removido da lista')
    else if (result === 'login') showToast('Erro ao remover')
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const dramas = allDramas.filter(d => myList.includes(d.id) &&
    (query === '' || d.title.toLowerCase().includes(query.toLowerCase()))
  ) as DramaWithIcon[]

  return (
    <div style={{ background:'#1A1A2E', minHeight:'100dvh', color:'#fff', fontFamily:'var(--rs-font-body)', paddingTop:'var(--rs-nav-h)' }}>
      <Nav activeLink="/lista"/>

      {/* Header */}
      <div style={{ padding:'2rem 4% 1.5rem', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.8rem', marginBottom:'.4rem' }}>
          <Bookmark size={22} color="var(--rs-primary)"/>
          <h1 style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.8rem', margin:0 }}>Minha Lista</h1>
        </div>
        <div style={{ fontSize:'var(--rs-body-sm)', color:'#8892A4' }}>
          {myList.length} {myList.length === 1 ? 'série guardada' : 'séries guardadas'}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}>
          <div style={{ color:'#8892A4', fontSize:'var(--rs-body-sm)' }}>A carregar...</div>
        </div>
      )}

      {/* Not logged in */}
      {!loading && !uid && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'5rem 2rem' }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(255,56,92,.12)', border:'1px solid rgba(255,56,92,.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--rs-primary)', marginBottom:'1.2rem' }}>
            <Bookmark size={30} strokeWidth={1.6}/>
          </div>
          <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.3rem', marginBottom:'.5rem' }}>Entra para criar a tua lista</div>
          <div style={{ color:'#8892A4', fontSize:'var(--rs-body-sm)', lineHeight:1.6, maxWidth:300, marginBottom:'1.4rem' }}>
            Guarda as tuas séries favoritas e acede a elas quando quiseres.
          </div>
          <Link href="/login" style={{ background:'var(--rs-grad-hero)', color:'#fff', padding:'.75rem 2rem', borderRadius:50, fontWeight:700, fontSize:'var(--rs-body-md)', textDecoration:'none', boxShadow:'var(--rs-shadow-btn)' }}>
            Entrar
          </Link>
        </div>
      )}

      {/* Logged in + has list */}
      {!loading && uid && myList.length > 0 && (
        <div style={{ padding:'1.2rem 4% 6rem' }}>
          {/* Search within list */}
          <div style={{ position:'relative', marginBottom:'1.2rem', maxWidth:400 }}>
            <Search style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)' }} size={15} color="#8892A4"/>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Pesquisar na minha lista..."
              style={{
                width:'100%', boxSizing:'border-box',
                background:'#16213E', border:'1px solid rgba(255,255,255,.1)',
                color:'#fff', padding:'.65rem .9rem .65rem 2.4rem',
                borderRadius:50, fontSize:'var(--rs-body-sm)', outline:'none',
                fontFamily:'var(--rs-font-body)',
              }}
            />
          </div>

          {dramas.length > 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:12 }}>
              {dramas.map(d => (
                <ListCard key={d.id} drama={d} onRemove={() => removeFromList(d.id)}/>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'3rem', color:'#8892A4', fontSize:'var(--rs-body-sm)' }}>
              Nenhuma série encontrada para "{query}"
            </div>
          )}
        </div>
      )}

      {/* Logged in + empty list */}
      {!loading && uid && myList.length === 0 && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'5rem 2rem' }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(255,56,92,.12)', border:'1px solid rgba(255,56,92,.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--rs-primary)', marginBottom:'1.2rem' }}>
            <Bookmark size={30} strokeWidth={1.6}/>
          </div>
          <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.3rem', marginBottom:'.5rem' }}>A tua lista está vazia</div>
          <div style={{ color:'#8892A4', fontSize:'var(--rs-body-sm)', lineHeight:1.6, maxWidth:300, marginBottom:'1.4rem' }}>
            Marca séries que queres ver mais tarde com o botão + nos cartazes.
          </div>
          <Link href="/explorar" style={{ background:'rgba(255,56,92,.15)', border:'1px solid rgba(255,56,92,.3)', color:'#fff', padding:'.65rem 1.5rem', borderRadius:50, fontWeight:700, fontSize:'var(--rs-body-sm)', textDecoration:'none' }}>
            Explorar séries
          </Link>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:'5rem', left:'50%', transform:'translateX(-50%)', background:'rgba(26,26,46,.97)', border:'1px solid rgba(255,255,255,.1)', borderRadius:50, padding:'.65rem 1.4rem', color:'#fff', fontSize:'var(--rs-body-sm)', fontWeight:600, boxShadow:'var(--rs-shadow-lg)', zIndex:999, whiteSpace:'nowrap', pointerEvents:'none' }}>
          {toast}
        </div>
      )}

      <Footer /><BottomNav/>
      <style>{`input::placeholder { color: #8892A4; } input:focus { border-color: var(--rs-primary) !important; outline: none; }`}</style>
    </div>
  )
}
