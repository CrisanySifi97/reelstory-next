'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { Upload, X, Search, Grid, RefreshCw } from 'lucide-react'
import { auth } from '@/lib/firebase'

async function uploadToBunny(file: File, folder: string): Promise<string> {
  const idToken = await auth.currentUser?.getIdToken()
  const fd = new FormData()
  fd.append('file', file)
  fd.append('folder', folder)
  const res  = await fetch('/api/bunny-upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: fd,
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.secure_url as string
}

interface CloudinaryAsset {
  public_id: string; secure_url: string; format: string
  width: number; height: number; bytes: number
  created_at: string; folder: string; display_name: string
}

interface Props {
  images: string[]
  onAdd: (url: string) => void
  onRemove: (url: string) => void
  folder?: string
  browseFolder?: string
  maxImages?: number
  label?: string
  single?: boolean
}

function CloudinaryBrowser({ folder, onSelect, onClose }: {
  folder: string; onSelect: (url: string) => void; onClose: () => void
}) {
  const [assets, setAssets]           = useState<CloudinaryAsset[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [search, setSearch]           = useState('')
  const [nextCursor, setNextCursor]   = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchAssets = useCallback(async (cursor?: string) => {
    cursor ? setLoadingMore(true) : setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ type: 'image', max: '80' })
      if (folder) params.set('folder', folder)
      if (cursor) params.set('next_cursor', cursor)
      const idToken = await auth.currentUser?.getIdToken()
      const res  = await fetch(`/api/bunny-browse?${params}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar')
      setAssets(prev => cursor ? [...prev, ...data.assets] : data.assets)
      setNextCursor(data.next_cursor ?? null)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false); setLoadingMore(false) }
  }, [folder])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  const filtered = assets.filter(a =>
    a.public_id.toLowerCase().includes(search.toLowerCase()) ||
    (a.display_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const thumb = (url: string) => `${url}?width=200&height=200&aspect_ratio=1:1&optimizer=image`

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1200, background:'rgba(0,0,0,.75)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }} onClick={onClose}>
      <div style={{ background:'#111827', borderRadius:16, width:'100%', maxWidth:860, maxHeight:'88vh', display:'flex', flexDirection:'column', border:'1px solid rgba(255,255,255,.1)' }} onClick={e => e.stopPropagation()}>

        <div style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'1rem 1.2rem', borderBottom:'1px solid rgba(255,255,255,.07)', flexShrink:0 }}>
          <Grid size={18} style={{ color:'var(--rs-primary)', flexShrink:0 }}/>
          <div>
            <div style={{ fontWeight:900, fontSize:'.95rem' }}>Biblioteca Bunny</div>
            <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,.4)' }}>{folder ? `/${folder}` : 'Todos os assets'} · {assets.length} imagens</div>
          </div>
          <div style={{ flex:1, position:'relative' }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', opacity:.5, color:'#fff' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar por nome..."
              style={{ width:'100%', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, padding:'.42rem .8rem .42rem 2rem', color:'#fff', fontSize:'.82rem', outline:'none', fontFamily:'inherit' }}/>
          </div>
          <button onClick={() => fetchAssets()} title="Actualizar" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'rgba(255,255,255,.6)' }}><RefreshCw size={13}/></button>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.5)', cursor:'pointer', display:'flex', padding:4 }}><X size={18}/></button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'1rem' }}>
          {loading && <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,.4)' }}><div style={{ width:36, height:36, border:'3px solid rgba(255,255,255,.1)', borderTopColor:'var(--rs-primary)', borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 1rem' }}/> A carregar...</div>}
          {error   && <div style={{ textAlign:'center', padding:'2rem', color:'#ef4444', fontSize:'.84rem' }}>! {error}</div>}
          {!loading && !error && filtered.length === 0 && <div style={{ textAlign:'center', padding:'3rem', color:'rgba(255,255,255,.3)' }}>Sem resultados</div>}
          {!loading && filtered.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:8 }}>
              {filtered.map(asset => (
                <div key={asset.public_id}
                  onClick={() => { onSelect(asset.secure_url); onClose() }}
                  title={asset.display_name || asset.public_id}
                  style={{ borderRadius:10, overflow:'hidden', cursor:'pointer', border:'2px solid transparent', transition:'border .15s, transform .15s', aspectRatio:'1', background:'rgba(255,255,255,.05)', position:'relative' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='var(--rs-primary)'; el.style.transform='scale(1.04)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='transparent'; el.style.transform='scale(1)' }}>
                  <img src={thumb(asset.secure_url)} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} loading="lazy"/>
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'linear-gradient(to top, rgba(0,0,0,.85), transparent)', padding:'4px 5px', fontSize:'.6rem', color:'rgba(255,255,255,.8)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {asset.display_name || asset.public_id.split('/').pop()}
                  </div>
                </div>
              ))}
            </div>
          )}
          {nextCursor && !loading && (
            <div style={{ textAlign:'center', paddingTop:'1rem' }}>
              <button onClick={() => fetchAssets(nextCursor)} disabled={loadingMore}
                style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.7)', borderRadius:8, padding:'.5rem 1.4rem', cursor:loadingMore?'default':'pointer', fontSize:'.82rem' }}>
                {loadingMore ? 'A carregar...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </div>

        <div style={{ padding:'.75rem 1.2rem', borderTop:'1px solid rgba(255,255,255,.07)', fontSize:'.72rem', color:'rgba(255,255,255,.35)', flexShrink:0 }}>
          Clica numa imagem para seleccionar · {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}

export default function ImageUpload({
  images, onAdd, onRemove,
  folder = 'banners', browseFolder = '',
  maxImages = 20, label = 'Adicionar imagem', single = false,
}: Props) {
  const inputRef                      = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]     = useState(false)
  const [progress, setProgress]       = useState(0)
  const [urlInput, setUrlInput]       = useState('')
  const [tab, setTab]                 = useState<'upload'|'url'|'browse'>('browse')
  const [error, setError]             = useState('')
  const [showBrowser, setShowBrowser] = useState(false)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Apenas imagens'); return }
    if (file.size > 10 * 1024 * 1024)   { setError('Maximo 10 MB'); return }
    setError(''); setUploading(true)
    const tick = setInterval(() => setProgress(p => Math.min(p + 8, 90)), 300)
    try {
      const url = await uploadToBunny(file, folder)
      if (single && images.length > 0) images.forEach(old => onRemove(old))
      onAdd(url); setProgress(100)
    } catch (e: any) { setError(e?.message || 'Erro no upload.')
    } finally { clearInterval(tick); setTimeout(() => { setUploading(false); setProgress(0) }, 500) }
  }

  const handleUrlAdd = () => {
    const u = urlInput.trim()
    if (!u.startsWith('http')) { setError('URL invalido'); return }
    if (single && images.length > 0) images.forEach(old => onRemove(old))
    onAdd(u); setUrlInput(''); setError('')
  }

  const handleSelect = (url: string) => {
    if (single && images.length > 0) images.forEach(old => onRemove(old))
    onAdd(url)
  }

  const canAdd = !uploading && (single ? true : images.length < maxImages)
  const TABS = [{ id:'browse' as const, label:'Biblioteca' }, { id:'upload' as const, label:'Upload' }, { id:'url' as const, label:'URL' }]

  return (
    <div>
      <div style={{ display:'flex', gap:3, background:'var(--rs-bg-cool-3)', borderRadius:8, padding:3, marginBottom:10 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:'.38rem', borderRadius:6, border:'none', cursor:'pointer', fontSize:'.74rem', fontWeight:700, transition:'all .15s', background:tab===t.id?'var(--rs-bg-cool)':'transparent', color:tab===t.id?'#fff':'var(--rs-text-muted)' }}>
            {t.id==='browse' ? '☁️ '+t.label : t.id==='upload' ? '↑ '+t.label : '🔗 '+t.label}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <div onClick={() => canAdd && setShowBrowser(true)}
          onMouseEnter={e => canAdd && ((e.currentTarget as HTMLElement).style.borderColor='var(--rs-primary)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor='')}
          style={{ border:'2px dashed var(--rs-border-base)', borderRadius:12, padding:'1.1rem', textAlign:'center', cursor:canAdd?'pointer':'default', background:'var(--rs-bg-cool-3)', transition:'border-color .2s', userSelect:'none' }}>
          <Grid size={20} style={{ color:'var(--rs-text-muted)', marginBottom:5 }}/>
          <div style={{ fontSize:'.84rem', fontWeight:600, marginBottom:2 }}>Abrir Biblioteca Bunny</div>
          <div style={{ fontSize:'.70rem', color:'var(--rs-text-muted)' }}>Selecciona uma imagem ja existente no Bunny</div>
        </div>
      )}

      {tab === 'upload' && (
        <div onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f)}} onDragOver={e=>e.preventDefault()}
          onClick={()=>canAdd&&inputRef.current?.click()}
          style={{ border:`2px dashed ${uploading?'var(--rs-primary)':'var(--rs-border-base)'}`, borderRadius:12, padding:'1.1rem', textAlign:'center', cursor:canAdd?'pointer':'default', background:uploading?'rgba(255,56,92,.05)':'var(--rs-bg-cool-3)', transition:'border-color .2s, background .2s', userSelect:'none' }}>
          {uploading
            ? <><div style={{ fontSize:'1.4rem', marginBottom:6, display:'inline-block' }}>loading</div><div style={{ fontSize:'.82rem', fontWeight:700, color:'var(--rs-primary)', marginBottom:8 }}>A fazer upload... {progress}%</div><div style={{ height:5, background:'var(--rs-border-soft)', borderRadius:3, overflow:'hidden' }}><div style={{ height:'100%', width:`${progress}%`, background:'var(--rs-grad-hero)', borderRadius:3 }}/></div></>
            : <><Upload size={20} style={{ color:'var(--rs-text-muted)', marginBottom:5 }}/><div style={{ fontSize:'.84rem', fontWeight:600, marginBottom:2 }}>{label}</div><div style={{ fontSize:'.70rem', color:'var(--rs-text-muted)' }}>Arrasta ou clica JPG PNG max 10 MB</div></>
          }
          <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);e.target.value=''}}/>
        </div>
      )}

      {tab === 'url' && (
        <div style={{ display:'flex', gap:6 }}>
          <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleUrlAdd()}} placeholder="https://exemplo.com/imagem.jpg"
            style={{ flex:1, background:'var(--rs-bg-cool-3)', border:'1px solid var(--rs-border-base)', color:'#fff', padding:'.52rem .85rem', borderRadius:8, fontSize:'.84rem', fontFamily:'var(--rs-font-body)', outline:'none' }}/>
          <button onClick={handleUrlAdd} style={{ background:'var(--rs-grad-hero)', border:'none', color:'#fff', borderRadius:8, padding:'.52rem 1rem', fontSize:'.82rem', fontWeight:700, cursor:'pointer', flexShrink:0 }}>Adicionar</button>
        </div>
      )}

      {error && <div style={{ fontSize:'.74rem', color:'#ef4444', marginTop:6, padding:'.4rem .6rem', background:'rgba(239,68,68,.08)', borderRadius:6, border:'1px solid rgba(239,68,68,.2)' }}>{error}</div>}

      {images.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))', gap:6, marginTop:10 }}>
          {images.map((url, i) => (
            <div key={i} style={{ position:'relative', aspectRatio:'2/3', borderRadius:8, overflow:'hidden', background:'var(--rs-bg-cool-3)', border:'1px solid var(--rs-border-base)' }}>
              <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} onError={e=>{(e.currentTarget.parentElement as HTMLElement).style.background='#1a1a2e'}}/>
              <button onClick={()=>onRemove(url)} style={{ position:'absolute', top:3, right:3, width:18, height:18, borderRadius:'50%', background:'rgba(0,0,0,.75)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0 }}><X size={10}/></button>
            </div>
          ))}
        </div>
      )}

      {showBrowser && <CloudinaryBrowser folder={browseFolder || folder} onSelect={handleSelect} onClose={()=>setShowBrowser(false)}/>}
      <style>{'@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}
