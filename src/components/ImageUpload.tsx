'use client'
import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    ?? ''
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? ''

async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', UPLOAD_PRESET)
  fd.append('folder', folder)
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method:'POST', body:fd })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.secure_url as string
}

interface Props {
  images: string[]
  onAdd: (url: string) => void
  onRemove: (url: string) => void
  folder?: string       // Cloudinary folder, e.g. "banners/login"
  maxImages?: number
  label?: string
  single?: boolean      // replace instead of add
}

export default function ImageUpload({
  images, onAdd, onRemove,
  folder = 'banners',
  maxImages = 20,
  label = 'Adicionar imagem',
  single = false,
}: Props) {
  const inputRef               = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [urlInput, setUrlInput]   = useState('')
  const [tab, setTab]             = useState<'upload'|'url'>('upload')
  const [error, setError]         = useState('')

  const configured = CLOUD_NAME && UPLOAD_PRESET

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Apenas imagens são aceites'); return }
    if (file.size > 10 * 1024 * 1024)   { setError('Máximo 10 MB por imagem'); return }
    if (!configured) { setError('Cloudinary não configurado — adiciona NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME e NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET nas variáveis de ambiente do Vercel'); return }
    setError(''); setUploading(true)
    // Simulate progress while uploading (Cloudinary doesn't expose XHR progress easily via fetch)
    const tick = setInterval(() => setProgress(p => Math.min(p + 8, 90)), 300)
    try {
      const url = await uploadToCloudinary(file, folder)
      if (single && images.length > 0) images.forEach(old => onRemove(old))
      onAdd(url)
      setProgress(100)
    } catch (e: any) {
      setError(e?.message || 'Erro no upload. Verifica as credenciais Cloudinary.')
    } finally {
      clearInterval(tick)
      setTimeout(() => { setUploading(false); setProgress(0) }, 500)
    }
  }

  const handleUrlAdd = () => {
    const u = urlInput.trim()
    if (!u.startsWith('http')) { setError('URL inválido — deve começar com http'); return }
    if (single && images.length > 0) images.forEach(old => onRemove(old))
    onAdd(u); setUrlInput(''); setError('')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const canAdd = !uploading && (single ? true : images.length < maxImages)

  return (
    <div>
      {/* Tab toggle */}
      <div style={{ display:'flex', gap:3, background:'var(--rs-bg-cool-3)', borderRadius:8, padding:3, marginBottom:10 }}>
        {(['upload','url'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{
            flex:1, padding:'.38rem', borderRadius:6, border:'none', cursor:'pointer',
            fontSize:'.76rem', fontWeight:700, transition:'all .15s',
            background: tab===t ? 'var(--rs-bg-cool)' : 'transparent',
            color:       tab===t ? '#fff'              : 'var(--rs-text-muted)',
          }}>
            {t==='upload' ? '↑ Ficheiro' : '🔗 URL'}
          </button>
        ))}
      </div>

      {tab==='upload' ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => canAdd && inputRef.current?.click()}
          style={{
            border:`2px dashed ${uploading ? 'var(--rs-primary)' : 'var(--rs-border-base)'}`,
            borderRadius:12, padding:'1.1rem', textAlign:'center',
            cursor: canAdd ? 'pointer' : 'default',
            background: uploading ? 'rgba(255,56,92,.05)' : 'var(--rs-bg-cool-3)',
            transition:'border-color .2s, background .2s',
            userSelect:'none',
          }}>
          {uploading ? (
            <>
              <div style={{ fontSize:'1.4rem', marginBottom:6, animation:'spin .8s linear infinite', display:'inline-block' }}>⏳</div>
              <div style={{ fontSize:'.82rem', fontWeight:700, color:'var(--rs-primary)', marginBottom:8 }}>A fazer upload... {progress}%</div>
              <div style={{ height:5, background:'var(--rs-border-soft)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progress}%`, background:'var(--rs-grad-hero)', borderRadius:3, transition:'width .3s' }}/>
              </div>
            </>
          ) : (
            <>
              <Upload size={20} style={{ color:'var(--rs-text-muted)', marginBottom:5 }}/>
              <div style={{ fontSize:'.84rem', fontWeight:600, marginBottom:2 }}>{label}</div>
              <div style={{ fontSize:'.70rem', color:'var(--rs-text-muted)', lineHeight:1.4 }}>
                Arrasta ou clica · JPG PNG WebP · máx 10 MB
                {!configured && <><br/><span style={{ color:'#f59e0b' }}>⚠ Cloudinary não configurado</span></>}
              </div>
            </>
          )}
          <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value='' }}/>
        </div>
      ) : (
        <div style={{ display:'flex', gap:6 }}>
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter') handleUrlAdd() }}
            placeholder="https://exemplo.com/imagem.jpg"
            style={{
              flex:1, background:'var(--rs-bg-cool-3)',
              border:'1px solid var(--rs-border-base)', color:'#fff',
              padding:'.52rem .85rem', borderRadius:8, fontSize:'.84rem',
              fontFamily:'var(--rs-font-body)', outline:'none',
            }}
          />
          <button onClick={handleUrlAdd} style={{
            background:'var(--rs-grad-hero)', border:'none', color:'#fff',
            borderRadius:8, padding:'.52rem 1rem', fontSize:'.82rem',
            fontWeight:700, cursor:'pointer', flexShrink:0,
          }}>Adicionar</button>
        </div>
      )}

      {error && (
        <div style={{ fontSize:'.74rem', color:'#ef4444', marginTop:6, lineHeight:1.4, padding:'.4rem .6rem', background:'rgba(239,68,68,.08)', borderRadius:6, border:'1px solid rgba(239,68,68,.2)' }}>
          {error}
        </div>
      )}

      {/* Image thumbnails */}
      {images.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))', gap:6, marginTop:10 }}>
          {images.map((url, i) => (
            <div key={i} style={{ position:'relative', aspectRatio:'2/3', borderRadius:8, overflow:'hidden', background:'var(--rs-bg-cool-3)', border:'1px solid var(--rs-border-base)' }}>
              <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
                onError={e => { (e.currentTarget.parentElement as HTMLElement).style.background = '#1a1a2e' }}/>
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'40%', background:'linear-gradient(to top,rgba(0,0,0,.7),transparent)', pointerEvents:'none' }}/>
              <span style={{ position:'absolute', bottom:3, left:4, fontSize:'.58rem', color:'rgba(255,255,255,.7)', fontWeight:700 }}>{i+1}</span>
              <button
                onClick={() => onRemove(url)}
                style={{
                  position:'absolute', top:3, right:3,
                  width:18, height:18, borderRadius:'50%',
                  background:'rgba(0,0,0,.75)', border:'1px solid rgba(255,255,255,.2)',
                  color:'#fff', cursor:'pointer', display:'flex',
                  alignItems:'center', justifyContent:'center', padding:0,
                }}>
                <X size={10}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div style={{ fontSize:'.7rem', color:'var(--rs-text-muted)', marginTop:5 }}>
          {images.length} imagem{images.length!==1?'ns':''}{maxImages > 1 && ` · máx ${maxImages}`}
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
