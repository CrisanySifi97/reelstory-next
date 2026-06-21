'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Film, PlayCircle, Users, Receipt, Coins,
  Megaphone, Bell, BarChart3, Settings, LogOut, Search,
  TrendingUp, TrendingDown, Wallet, Eye, Plus, Edit2, Trash2,
  Save, X, Star, List, CheckCircle, XCircle, Gift,
  Send, Package, ToggleLeft, ToggleRight, PieChart, Activity,
} from 'lucide-react'
import ImageUpload from '@/components/ImageUpload'
import { auth, db } from '@/lib/firebase'
import {
  collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  doc, setDoc, deleteField, orderBy, query, serverTimestamp, where, writeBatch,
} from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { Drama, UserProfile, Order, Episode } from '@/types'
import { GENRE_LABELS, POINTS_PACKAGES } from '@/types'
import { DRAMAS as MOCK_DRAMAS } from '@/lib/mock'

type Section = 'dashboard' | 'series' | 'episodios' | 'utilizadores' | 'encomendas' | 'pacotes' | 'campanhas' | 'notificacoes' | 'analytics' | 'avaliacoes' | 'banners'

interface BannerLanding { title:string; subtitle:string; badge:string; ctaText:string; gradient:string; active:boolean }
interface BannerLogin   { tagline:string; s1n:string; s1l:string; s2n:string; s2l:string; s3n:string; s3l:string; active:boolean }
interface BannerInicio  { dramaId:string; active:boolean }
interface BannerExplorar{ dramaId:string; badgeText:string; active:boolean }
type BannerPage = 'landing'|'login'|'inicio'|'explorar'

interface RatingDoc { _id:string; dramaId:string; userId:string; rating:number; updatedAt?:{seconds:number} }
interface Campaign { _id:string; title:string; description:string; type:'banner'|'desconto'|'bonus'; value:string; startDate:string; endDate:string; active:boolean; target:'todos'|'novos'|'vip' }
interface PushNotif { _id:string; title:string; body:string; url?:string; sentAt?:{seconds:number}; count?:number }
type PkgForm = { name:string; pts:string; bonus:string; priceKz:string; badge:string }
type CampForm = { title:string; description:string; type:'banner'|'desconto'|'bonus'; value:string; startDate:string; endDate:string; active:boolean; target:'todos'|'novos'|'vip' }
const emptyCamp = (): CampForm => ({ title:'', description:'', type:'banner', value:'', startDate:'', endDate:'', active:true, target:'todos' })
type DramaForm = {
  title:string; genre:Drama['genre']; description:string; short:string
  status:Drama['status']; rating:string; badge:string
  year:string; cast:string; views:string; icon:string; posterGrad:string; posterImage:string; bannerImage:string
}
type EpForm = { title:string; url:string; free:boolean; order:number }

const GENRE_ICONS: Record<Drama['genre'], string[]> = {
  romance:     ['💕','❤️','💋','🌹','👯'],
  corporativo: ['💼','🏢','📊','🤝','👔'],
  suspense:    ['🔪','🕵️','💀','🌙','🔫'],
  comedia:     ['😂','🎭','🤣','😜','🎪'],
  terror:      ['👻','🕷️','💀','🦇','🔮'],
  acao:        ['⚔️','🦸','💥','🔥','🏹'],
}
const POSTER_PRESETS = [
  { label:'Romance',     value:'linear-gradient(135deg,#FF385C,#D50032)' },
  { label:'Romance 2',   value:'linear-gradient(135deg,#fa709a,#fee140)' },
  { label:'Romance 3',   value:'linear-gradient(135deg,#f093fb,#f5576c)' },
  { label:'Corp.',       value:'linear-gradient(135deg,#667eea,#764ba2)' },
  { label:'Corp. 2',     value:'linear-gradient(135deg,#a18cd1,#fbc2eb)' },
  { label:'Suspense',    value:'linear-gradient(135deg,#2d3561,#c05c7e)' },
  { label:'Suspense 2',  value:'linear-gradient(135deg,#434343,#000000)' },
  { label:'Comédia',     value:'linear-gradient(135deg,#43e97b,#38f9d7)' },
  { label:'Comédia 2',   value:'linear-gradient(135deg,#4facfe,#00f2fe)' },
  { label:'Terror',      value:'linear-gradient(135deg,#1a1a2e,#4a0e6b)' },
  { label:'Terror 2',    value:'linear-gradient(135deg,#3d0035,#9b0050)' },
  { label:'Acção',       value:'linear-gradient(135deg,#0f0c29,#302b63)' },
  { label:'Acção 2',     value:'linear-gradient(135deg,#0a3d62,#1e3799)' },
]
const emptyForm = (): DramaForm => ({
  title:'', genre:'romance', description:'', short:'',
  status:'Ativo', rating:'4.5', badge:'',
  year: String(new Date().getFullYear()), cast:'', views:'0', icon:'🎬', posterGrad:'linear-gradient(135deg,#FF385C,#D50032)', posterImage:'', bannerImage:'',
})
const emptyEp   = (n:number): EpForm => ({ title:'', url:'', free:n<=2, order:n })
const GENRES = Object.keys(GENRE_LABELS) as Drama['genre'][]
const fmt = (n:number) => n.toLocaleString('pt-AO')

export default function AdminPage() {
  const [authed, setAuthed]       = useState(false)
  const [checking, setChecking]   = useState(true)
  const [section, setSection]     = useState<Section>('dashboard')
  const [userInitial, setUserInitial] = useState('A')
  const [userName, setUserName]   = useState('Admin')
  const [search, setSearch]       = useState('')
  const [toast, setToast]         = useState('')

  const [dramas, setDramas]   = useState<(Drama & {_id:string})[]>([])
  const [users, setUsers]     = useState<(UserProfile & {_id:string})[]>([])
  const [orders, setOrders]   = useState<(Order & {_id:string})[]>([])
  const [ratings, setRatings] = useState<RatingDoc[]>([])

  const [form, setForm]         = useState<DramaForm>(emptyForm())
  const [editId, setEditId]     = useState<string|null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [formEps, setFormEps]   = useState<{title:string;url:string;free:boolean}[]>([])

  const [epDrama, setEpDrama]   = useState<(Drama & {_id:string})|null>(null)
  const [epList, setEpList]     = useState<Episode[]>([])
  const [epForm, setEpForm]     = useState<EpForm>(emptyEp(1))
  const [epSaving, setEpSaving] = useState(false)

  const [coinUser, setCoinUser]     = useState<(UserProfile & {_id:string})|null>(null)
  const [coinAmt, setCoinAmt]       = useState('')
  const [coinMode, setCoinMode]     = useState<'dar'|'retirar'>('dar')
  const [coinSaving, setCoinSaving] = useState(false)

  // Episodes section
  const [epFilter, setEpFilter]     = useState('')
  const [inlineEp, setInlineEp]     = useState<{dramaId:string;epId:string}|null>(null)
  const [inlineEpForm, setInlineEpForm] = useState({title:'',url:'',free:false})

  // Packages section
  const [pkgs, setPkgs]           = useState(POINTS_PACKAGES.map((p,i)=>({...p,_id:p.key})))
  const [pkgEditId, setPkgEditId] = useState<string|null>(null)
  const [pkgForm, setPkgForm]     = useState<PkgForm>({name:'',pts:'',bonus:'',priceKz:'',badge:''})
  const [pkgSaving, setPkgSaving] = useState(false)

  // Campaigns section
  const [campaigns, setCampaigns]       = useState<Campaign[]>([])
  const [campForm, setCampForm]         = useState<CampForm>(emptyCamp())
  const [campEditId, setCampEditId]     = useState<string|null>(null)
  const [showCampForm, setShowCampForm] = useState(false)
  const [campSaving, setCampSaving]     = useState(false)

  // Notifications section
  const [notifs, setNotifs]         = useState<PushNotif[]>([])
  const [notifForm, setNotifForm]   = useState({title:'',body:'',url:''})
  const [notifSending, setNotifSending] = useState(false)

  // Banners
  const [bannerTab, setBannerTab]   = useState<BannerPage>('landing')
  const [bannerSaving, setBannerSaving] = useState(false)
  const [bLanding, setBLanding]     = useState<BannerLanding & {heroImage?:string;phoneTitle?:string;phoneEp?:string}>({ title:'Dramas asiáticos na ponta dos dedos', subtitle:'Episódios curtos, paixões grandes. Descobre histórias incríveis a qualquer hora.', badge:'NOVO', ctaText:'Explorar grátis', gradient:'linear-gradient(135deg,#1a0533 0%,#2d1b69 40%,#141414 100%)', active:true, phoneTitle:'Amor em Segredo', phoneEp:'Ep. 8 · ★ 4.9 · 2,1M visualizações' })
  const [bLogin, setBLogin]         = useState<BannerLogin & {images?:string[]}>({ tagline:'Desbloqueia episódios com pontos. Sem mensalidades.', s1n:'500+', s1l:'Dramas', s2n:'2M+', s2l:'Fãs', s3n:'4.9★', s3l:'Avaliação', active:true, images:[] })
  const [bInicio, setBInicio]       = useState<BannerInicio & {heroImage?:string}>({ dramaId:'6', active:true })
  const [bExplorar, setBExplorar]   = useState<BannerExplorar & {bannerImage?:string}>({ dramaId:'1', badgeText:'EM DESTAQUE', active:true })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { window.location.href = '/login?next=/admin'; return }

      try {
        // Primary check — Firestore isAdmin flag
        const snap = await getDoc(doc(db, 'users', user.uid))
        let isAdminUser = snap.exists() && snap.data()?.isAdmin === true

        if (!isAdminUser) {
          // Bootstrap: server verifies email against ADMIN_EMAIL env var (never exposed to client)
          // and sets isAdmin via Admin SDK if it matches.
          const token = await user.getIdToken()
          const res = await fetch('/api/init-admin', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          })
          isAdminUser = res.ok
        }

        if (!isAdminUser) { window.location.href = '/'; return }
      } catch { window.location.href = '/'; return }

      setAuthed(true)
      setUserInitial((user.displayName || user.email || 'A')[0].toUpperCase())
      setUserName(user.displayName || user.email?.split('@')[0] || 'Admin')
      setChecking(false)
    })
    return unsub
  }, [])

  useEffect(() => { if (authed) { loadDramas(); loadUsers(); loadOrders(); loadRatings(); loadCampaigns(); loadNotifs(); loadBanners(); loadPkgs() } }, [authed])

  const loadPkgs = async () => {
    try {
      const snap = await getDocs(collection(db,'packages'))
      if (snap.empty) return
      const overrides = new Map(snap.docs.map(d => [d.id, d.data()]))
      setPkgs(prev => prev.map(p => {
        const o = overrides.get(p._id)
        return o ? { ...p, ...o } : p
      }))
    } catch {}
  }

  const loadDramas = async () => {
    try {
      const snap = await getDocs(query(collection(db,'dramas'), orderBy('title')))
      setDramas(snap.docs.map(d => {
        const data = d.data()
        return {
          _id: d.id,
          ...data,
          description: data.description || data.desc || '',
          posterGrad:  data.posterGrad  || data.grad  || 'linear-gradient(135deg,#FF385C,#D50032)',
          genre:       (data.genre?.toLowerCase() || 'romance') as Drama['genre'],
          icon:        data.icon || '🎬',
          status:      data.status || 'Ativo',
          rating:      data.rating ?? 0,
          views:       data.views  ?? 0,
          episodes:    data.episodes ?? [],
        } as Drama & {_id:string}
      }))
    } catch { setDramas(MOCK_DRAMAS.map(d => ({ ...d, _id:d.id })) as (Drama & {_id:string})[]) }
  }
  const loadUsers = async () => {
    try { const s = await getDocs(collection(db,'users')); setUsers(s.docs.map(d => ({ _id:d.id, ...d.data() } as UserProfile & {_id:string}))) } catch {}
  }
  const loadOrders = async () => {
    try { const s = await getDocs(query(collection(db,'orders'), orderBy('createdAt','desc'))); setOrders(s.docs.map(d => ({ _id:d.id, ...d.data() } as Order & {_id:string}))) } catch {}
  }
  const loadRatings = async () => {
    try { const s = await getDocs(query(collection(db,'ratings'), orderBy('updatedAt','desc'))); setRatings(s.docs.map(d => ({ _id:d.id, ...d.data() } as RatingDoc))) } catch {}
  }
  const loadBanners = async () => {
    try {
      const reads = (['landing','login','inicio','explorar'] as BannerPage[]).map(id =>
        getDoc(doc(db,'banners',id)).then(snap => ({ id, snap }))
      )
      const results = await Promise.all(reads)
      for (const { id, snap } of results) {
        if (!snap.exists()) continue
        const d = snap.data()
        if (id==='landing')  setBLanding(p=>({...p,...d}))
        if (id==='login')    setBLogin(p=>({...p,...d}))
        if (id==='inicio')   setBInicio(p=>({...p,...d}))
        if (id==='explorar') setBExplorar(p=>({...p,...d}))
      }
    } catch {}
  }
  const saveBanner = async (id: BannerPage, data: object) => {
    setBannerSaving(true)
    try {
      await setDoc(doc(db,'banners',id), data)
      showToast(`Banner "${id}" guardado`)
    } catch { showToast('Erro ao guardar banner') }
    finally { setBannerSaving(false) }
  }

  const loadCampaigns = async () => {
    try { const s = await getDocs(query(collection(db,'campaigns'), orderBy('startDate','desc'))); setCampaigns(s.docs.map(d=>({ _id:d.id, ...d.data() } as Campaign))) } catch {}
  }
  const loadNotifs = async () => {
    try { const s = await getDocs(query(collection(db,'notifications'), orderBy('sentAt','desc'))); setNotifs(s.docs.map(d=>({ _id:d.id, ...d.data() } as PushNotif))) } catch {}
  }

  /* â"€â"€ Episode inline edit â"€â"€ */
  const saveInlineEp = async () => {
    if (!inlineEp) return
    const drama = dramas.find(d=>d._id===inlineEp.dramaId); if (!drama) return
    const newEps = (drama.episodes||[]).map(e=>e.id===inlineEp.epId?{...e,...inlineEpForm,url:inlineEpForm.url.trim()}:e)
    await updateDoc(doc(db,'dramas',inlineEp.dramaId),{episodes:newEps})
    setInlineEp(null); loadDramas(); showToast('Episódio guardado')
  }
  const deleteEpFromDrama = async (dramaId:string, epId:string) => {
    if (!confirm('Eliminar episódio?')) return
    const drama = dramas.find(d=>d._id===dramaId); if (!drama) return
    await updateDoc(doc(db,'dramas',dramaId),{episodes:(drama.episodes||[]).filter(e=>e.id!==epId)})
    loadDramas(); showToast('Episódio eliminado')
  }

  /* â"€â"€ Package edit â"€â"€ */
  const handleSavePkg = async () => {
    if (!pkgEditId) return
    setPkgSaving(true)
    try {
      const data = { name:pkgForm.name, pts:parseInt(pkgForm.pts)||0, bonus:parseInt(pkgForm.bonus)||0, priceKz:parseInt(pkgForm.priceKz)||0, badge:pkgForm.badge || deleteField() }
      await setDoc(doc(db,'packages',pkgEditId), data, { merge: true })
      setPkgs(p=>p.map(x=>x._id===pkgEditId?{...x,...data,badge:pkgForm.badge||undefined}:x))
      setPkgEditId(null); showToast('Pacote actualizado')
    } catch {
      setPkgs(p=>p.map(x=>x._id===pkgEditId?{...x,name:pkgForm.name,pts:parseInt(pkgForm.pts)||x.pts,bonus:parseInt(pkgForm.bonus)||x.bonus,priceKz:parseInt(pkgForm.priceKz)||x.priceKz,badge:pkgForm.badge||undefined}:x))
      setPkgEditId(null); showToast('Pacote actualizado localmente')
    } finally { setPkgSaving(false) }
  }

  /* â"€â"€ Campaign CRUD â"€â"€ */
  const handleSaveCamp = async () => {
    if (!campForm.title.trim()) return
    setCampSaving(true)
    try {
      if (campEditId) { await updateDoc(doc(db,'campaigns',campEditId), campForm); showToast('Campanha actualizada') }
      else { await addDoc(collection(db,'campaigns'),{...campForm,createdAt:serverTimestamp()}); showToast('Campanha criada') }
      setShowCampForm(false); setCampEditId(null); setCampForm(emptyCamp()); loadCampaigns()
    } finally { setCampSaving(false) }
  }
  const handleDeleteCamp = async (id:string) => {
    if (!confirm('Eliminar campanha?')) return
    await deleteDoc(doc(db,'campaigns',id)); loadCampaigns(); showToast('Campanha eliminada')
  }
  const handleToggleCamp = async (camp:Campaign) => {
    await updateDoc(doc(db,'campaigns',camp._id),{active:!camp.active})
    loadCampaigns()
  }

  /* â"€â"€ Notifications â"€â"€ */
  const handleSendNotif = async () => {
    if (!notifForm.title.trim()||!notifForm.body.trim()) return
    setNotifSending(true)
    try {
      // Call server-side API to send via FCM
      const idToken = await auth.currentUser?.getIdToken()
      const res = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(notifForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro no servidor')

      // Log to Firestore
      await addDoc(collection(db,'notifications'), {
        ...notifForm, sentAt:serverTimestamp(),
        count: data.sent ?? 0, failed: data.failed ?? 0,
      })
      setNotifForm({title:'',body:'',url:''})
      loadNotifs()
      showToast(
        data.sent > 0
          ? `✓ Enviado para ${data.sent} dispositivo${data.sent!==1?'s':''}`
          : data.message || `Enviado (${data.sent ?? 0} tokens activos)`
      )
    } catch (e: any) {
      showToast(`Erro: ${e.message}`)
    } finally { setNotifSending(false) }
  }

  const handleSaveDrama = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const data = {
        title:       form.title.trim(),
        genre:       form.genre,
        description: form.description.trim(),
        short:       form.short.trim() || null,
        status:      form.status,
        rating:      parseFloat(form.rating) || 4.5,
        posterGrad:  form.posterGrad || `var(--rs-poster-${form.genre})`,
        posterImage: form.posterImage || null,
        bannerImage: form.bannerImage || null,
        badge:       form.badge || null,
        views:       parseInt(form.views) || 0,
        year:        parseInt(form.year) || new Date().getFullYear(),
        icon:        form.icon || '🎬',
        cast:        form.cast ? form.cast.split(',').map(s=>s.trim()).filter(Boolean) : [],
      }
      const episodes: Episode[] = formEps
        .filter(e=>e.title.trim()&&e.url.trim())
        .map((e,i)=>({ id:Date.now().toString()+i, title:e.title.trim(), url:e.url.trim(), free:e.free, order:i+1 }))
      if (editId) {
        await updateDoc(doc(db,'dramas',editId), { ...data, ...(episodes.length?{episodes}:{}) })
        showToast('Série actualizada')
      } else {
        await addDoc(collection(db,'dramas'), { ...data, episodes, createdAt:serverTimestamp() })
        showToast(`Série criada com ${episodes.length} episódio${episodes.length!==1?'s':''}`)
      }
      setShowForm(false); setEditId(null); setForm(emptyForm()); setFormEps([]); loadDramas()
    } finally { setSaving(false) }
  }
  const handleDelete = async (id:string, title:string) => {
    if (!confirm(`Eliminar "${title}"?`)) return
    await deleteDoc(doc(db,'dramas',id)); showToast('Série eliminada'); loadDramas()
  }
  const openEpisodes = (d: Drama & {_id:string}) => {
    setEpDrama(d); setEpList([...(d.episodes||[])].sort((a,b)=>a.order-b.order)); setEpForm(emptyEp((d.episodes?.length||0)+1))
  }
  const handleSaveEp = async () => {
    if (!epDrama || !epForm.title.trim() || !epForm.url.trim()) return
    setEpSaving(true)
    try {
      const newEp: Episode = { id:Date.now().toString(), title:epForm.title.trim(), url:epForm.url.trim(), free:epForm.free, order:epForm.order }
      const newList = [...epList, newEp].sort((a,b)=>a.order-b.order)
      await updateDoc(doc(db,'dramas',epDrama._id), { episodes:newList })
      setEpList(newList); setEpForm(emptyEp(newList.length+1)); showToast('Episódio adicionado'); loadDramas()
    } finally { setEpSaving(false) }
  }
  const handleDeleteEp = async (idx:number) => {
    if (!epDrama || !confirm('Remover episódio?')) return
    const newList = epList.filter((_,i)=>i!==idx)
    await updateDoc(doc(db,'dramas',epDrama._id), { episodes:newList }); setEpList(newList); loadDramas()
  }
  const handleGiveCoins = async () => {
    if (!coinUser || !coinAmt.trim()) return
    const abs = parseInt(coinAmt); if (isNaN(abs) || abs <= 0) return
    const amt = coinMode === 'retirar' ? -abs : abs
    const newCoins = Math.max(0, (coinUser.coins||0) + amt)
    setCoinSaving(true)
    try {
      await updateDoc(doc(db,'users',coinUser._id), { coins: newCoins })
      showToast(`${coinMode==='dar'?'+':'-'}${abs} pts para ${coinUser.name} · saldo: ${fmt(newCoins)}`)
      setCoinUser(null); setCoinAmt(''); loadUsers()
    } finally { setCoinSaving(false) }
  }
  const handleToggleStatus = async (u: UserProfile & {_id:string}) => {
    const next = u.status==='Ativo' ? 'Suspenso' : 'Ativo'
    await updateDoc(doc(db,'users',u._id), { status:next }); showToast(`${u.name} → ${next}`); loadUsers()
  }
  const handleOrderStatus = async (o: Order & {_id:string}, status:'Aprovado'|'Rejeitado') => {
    await updateDoc(doc(db,'orders',o._id), { status })
    if (status==='Aprovado' && o.userId) {
      try {
        const snap = await getDoc(doc(db,'users',o.userId))
        if (snap.exists()) await updateDoc(doc(db,'users',o.userId), { coins:(snap.data().coins||0)+(o.points||0) })
      } catch {}
    }
    showToast(`Encomenda ${status.toLowerCase()}`); loadOrders()
  }
  const resetDramaRatings = async (dramaId:string, title:string) => {
    if (!confirm(`Apagar avaliações de "${title}"?`)) return
    const snap = await getDocs(query(collection(db,'ratings'),where('dramaId','==',dramaId)))
    const batch = writeBatch(db); snap.docs.forEach(d=>batch.delete(d.ref))
    batch.update(doc(db,'dramas',dramaId),{rating:0,ratingCount:0}); await batch.commit()
    showToast('Avaliações eliminadas'); loadRatings(); loadDramas()
  }
  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(''),2800) }

  const [dramaSort, setDramaSort] = useState<'title'|'episodes'|'rating'|'views'|'status'|'createdAt'>('title')
  const [dramaSortDir, setDramaSortDir] = useState<'asc'|'desc'>('asc')
  const toggleSort = (col: typeof dramaSort) => {
    if (dramaSort === col) setDramaSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setDramaSort(col); setDramaSortDir('asc') }
  }
  const filteredDramas = dramas
    .filter(d => d.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const dir = dramaSortDir === 'asc' ? 1 : -1
      if (dramaSort === 'title')    return dir * a.title.localeCompare(b.title)
      if (dramaSort === 'episodes') return dir * ((a.episodes?.length||0) - (b.episodes?.length||0))
      if (dramaSort === 'rating')   return dir * ((a.rating||0) - (b.rating||0))
      if (dramaSort === 'views')    return dir * ((a.views||0) - (b.views||0))
      if (dramaSort === 'status')   return dir * a.status.localeCompare(b.status)
      if (dramaSort === 'createdAt') return dir * ((a as any).createdAt?.seconds||0) - ((b as any).createdAt?.seconds||0)
      return 0
    })
  const filteredUsers   = users.filter(u=>(u.name||'').toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase()))
  const filteredOrders  = orders.filter(o=>(o.userName||'').toLowerCase().includes(search.toLowerCase())||(o.package||'').toLowerCase().includes(search.toLowerCase()))
  const approvedOrders  = orders.filter(o=>o.status==='Aprovado')
  const totalRevenue    = approvedOrders.reduce((s,o)=>s+parseFloat((o.amount||'0').replace(/\D/g,'')),0)
  const pendingOrders   = orders.filter(o=>o.status==='Pendente').length
  const totalCoins      = users.reduce((s,u)=>s+(u.coins||0),0)
  const activeDramas    = dramas.filter(d=>d.status==='Ativo')
  const totalViews      = dramas.reduce((s,d)=>s+(d.views||0),0)
  const GENRE_COLORS: Record<string,string> = { romance:'#FF385C', corporativo:'#FFD93D', suspense:'#667eea', comedia:'#22c55e', terror:'#a855f7', acao:'#3b82f6' }
  const genreStats = Object.entries(GENRE_LABELS).map(([key,label])=>({
    key, label, color: GENRE_COLORS[key]||'#888',
    count: dramas.filter(d=>d.genre===key).length,
    views: dramas.filter(d=>d.genre===key).reduce((s,d)=>s+(d.views||0),0),
  })).filter(g=>g.count>0).sort((a,b)=>b.views-a.views)
  const maxGenreViews = Math.max(...genreStats.map(g=>g.views), 1)
  const pkgStats = ['Basico','Popular','Mega','Ultra VIP'].map(name=>({
    name, count: approvedOrders.filter(o=>o.package===name).length,
    revenue: approvedOrders.filter(o=>o.package===name).reduce((s,o)=>s+parseFloat((o.amount||'0').replace(/\D/g,'')),0),
  })).filter(p=>p.count>0)

  if (checking) return (
    <div style={{ background:'var(--rs-bg-cool-3)', minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'var(--rs-text-muted)' }}>A verificar acesso...</div>
    </div>
  )
  if (!authed) return null

  const nav = (label:string, Icon:React.ElementType, sec:Section, badge?:number) => (
    <div className={`nav-item${section===sec?' on':''}`} onClick={()=>setSection(sec)}>
      <Icon size={16}/>{label}
      {badge && badge>0 ? <span className="nav-badge">{badge}</span> : null}
    </div>
  )

  const statusBadge = (s:string) => {
    const cls = s==='Aprovado'||s==='Ativo' ? 'badge b-green' : s==='Pendente'||s==='Rascunho' ? 'badge b-yellow' : s==='Rejeitado'||s==='Suspenso' ? 'badge b-red' : 'badge b-blue'
    return <span className={cls}>{s}</span>
  }

  return (
    <>
    <div className="admin-root">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="s-logo">
          <span className="lg">Reel<span>Story</span></span>
          <span className="s-tag">Admin</span>
        </div>
        <div className="nav-label">Operação</div>
        {nav('Dashboard', LayoutDashboard, 'dashboard')}
        {nav('Séries', Film, 'series', dramas.length||undefined)}
        {nav('Episódios', PlayCircle, 'episodios', dramas.reduce((s,d)=>s+(d.episodes?.length||0),0)||undefined)}
        {nav('Utilizadores', Users, 'utilizadores', users.length||undefined)}
        <div className="nav-label">Comércio</div>
        {nav('Encomendas', Receipt, 'encomendas', pendingOrders||undefined)}
        {nav('Avaliações', Star, 'avaliacoes', ratings.length||undefined)}
        {nav('Pacotes de pontos', Package, 'pacotes')}
        {nav('Campanhas', Megaphone, 'campanhas', campaigns.filter(c=>c.active).length||undefined)}
        <div className="nav-label">Sistema</div>
        {nav('Notificações push', Bell, 'notificacoes', notifs.length||undefined)}
        {nav('Analytics', BarChart3, 'analytics')}
        {nav('Banners', Megaphone, 'banners')}
        <Link href="/inicio" className="nav-item" style={{ textDecoration:'none' }}><Settings size={16}/>Voltar ao site</Link>
        <div className="s-foot">
          <div className="av">{userInitial}</div>
          <div><div className="nm">{userName}</div><div className="rl">Admin</div></div>
          <button className="out" onClick={()=>{ signOut(auth); window.location.href='/' }}><LogOut size={16}/></button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="main">
        <header className="topbar">
          <div className="pg-title">
            {({ dashboard:'Dashboard', series:'Séries', episodios:'Episódios', utilizadores:'Utilizadores', encomendas:'Encomendas', pacotes:'Pacotes de Pontos', campanhas:'Campanhas', notificacoes:'Notificações Push', analytics:'Analytics', avaliacoes:'Avaliações', banners:'Banners das Páginas' } as Record<Section,string>)[section]}
          </div>
          {section !== 'dashboard' && (
            <div className="search">
              <Search size={14}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Procurar..."/>
            </div>
          )}
          {section === 'series' && (
            <button className="ibtn" style={{ width:'auto', padding:'0 .9rem', gap:'.4rem', display:'flex', fontSize:'.84rem', fontWeight:700, background:'var(--rs-primary)', border:'none', color:'#fff', borderRadius:10 }}
              onClick={()=>{ setForm(emptyForm()); setEditId(null); setShowForm(true) }}>
              <Plus size={15}/> Nova série
            </button>
          )}
          <button className="ibtn" onClick={()=>setSection('notificacoes')}><Bell size={15}/><span className="dot"/></button>
        </header>

        <div className="content">

          {/* ══ DASHBOARD ══ */}
          {section==='dashboard' && (<>
            <div className="kpis">
              <div className="kpi k1">
                <div className="kpi-lbl">Utilizadores activos</div>
                <div className="kpi-val">{users.length>0?fmt(users.length):'—'}</div>
                <div className="kpi-d up"><TrendingUp size={12}/>{users.length} registados</div>
                <div className="kpi-ic"><Users size={18}/></div>
              </div>
              <div className="kpi k2">
                <div className="kpi-lbl">Receita (mês)</div>
                <div className="kpi-val">{totalRevenue>0?`Kz ${fmt(totalRevenue)}`:'Kz 0'}</div>
                <div className="kpi-d up"><TrendingUp size={12}/>{approvedOrders.length} aprovadas</div>
                <div className="kpi-ic"><Wallet size={18}/></div>
              </div>
              <div className="kpi k3">
                <div className="kpi-lbl">Pontos em circulação</div>
                <div className="kpi-val">{fmt(users.reduce((s,u)=>s+(u.coins||0),0))}</div>
                <div className="kpi-d up"><TrendingUp size={12}/>{users.length} utilizadores</div>
                <div className="kpi-ic"><Coins size={18}/></div>
              </div>
              <div className="kpi k4">
                <div className="kpi-lbl">Séries activas</div>
                <div className="kpi-val">{fmt(activeDramas.length)}</div>
                <div className="kpi-d up"><TrendingUp size={12}/>{ratings.length} avaliações</div>
                <div className="kpi-ic"><Eye size={18}/></div>
              </div>
            </div>

            <div className="charts">
              <div className="card">
                <div className="ch-head"><div>
                  <div className="ch-t">Vistas por género</div>
                  <div className="ch-s">{totalViews>0?`${fmt(totalViews)} vistas no total`:'Sem séries ainda'}</div>
                </div></div>
                {genreStats.length>0 ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:8 }}>
                    {genreStats.map(g=>(
                      <div key={g.key}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.78rem', marginBottom:4 }}>
                          <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ width:10, height:10, borderRadius:'50%', background:g.color, display:'inline-block' }}/>
                            {g.label}
                          </span>
                          <span style={{ color:'var(--rs-text-muted)' }}>{fmt(g.views)} vistas · {g.count} {g.count===1?'série':'séries'}</span>
                        </div>
                        <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,.08)' }}>
                          <div style={{ height:'100%', width:`${Math.round((g.views/maxGenreViews)*100)}%`, background:g.color, borderRadius:3, transition:'width .4s' }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign:'center', padding:'2rem 0', color:'var(--rs-text-muted)', fontSize:'.84rem' }}>Adiciona séries para ver estatísticas por género</div>
                )}
              </div>
              <div className="card">
                <div className="ch-head"><div>
                  <div className="ch-t">Encomendas por pacote</div>
                  <div className="ch-s">{orders.length>0?`${approvedOrders.length} aprovadas · ${pendingOrders} pendentes`:'Sem encomendas ainda'}</div>
                </div></div>
                {pkgStats.length>0 ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:8 }}>
                    {pkgStats.map(p=>(
                      <div key={p.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'.65rem .8rem', background:'var(--rs-bg-cool-3)', borderRadius:10 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:'.88rem' }}>{p.name}</div>
                          <div style={{ fontSize:'.74rem', color:'var(--rs-text-muted)', marginTop:2 }}>{p.count} {p.count===1?'encomenda':'encomendas'}</div>
                        </div>
                        <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'.92rem', color:'var(--rs-accent)' }}>Kz {fmt(p.revenue)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign:'center', padding:'2rem 0', color:'var(--rs-text-muted)', fontSize:'.84rem' }}>Sem encomendas aprovadas ainda</div>
                )}
              </div>
            </div>

            <div className="tables">
              <div className="card">
                <div className="t-head"><div className="t-t">Encomendas recentes</div><span className="seemore" onClick={()=>setSection('encomendas')}>Ver todas &rarr;</span></div>
                {orders.length>0 ? (
                  <table>
                    <thead><tr><th>Utilizador</th><th>Pacote</th><th>Método</th><th className="right">Valor</th><th className="right">Estado</th></tr></thead>
                    <tbody>
                      {orders.slice(0,6).map((o,i)=>(
                        <tr key={i}><td>{o.userName||o.userEmail||'—'}</td><td>{o.package}</td><td>{o.method||'Kursinha'}</td>
                          <td className="right gold">Kz {fmt(parseFloat((o.amount||'0').replace(/D/g,'')))}</td>
                          <td className="right">{statusBadge(o.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign:'center', padding:'2rem 0', color:'var(--rs-text-muted)', fontSize:'.84rem' }}>Ainda não há encomendas</div>
                )}
              </div>
              <div className="card">
                <div className="t-head"><div className="t-t">Séries em alta</div><span className="seemore" onClick={()=>setSection('series')}>Ver todas &rarr;</span></div>
                {dramas.length>0 ? (
                  <table>
                    <thead><tr><th>Série</th><th className="right">Vistas</th><th className="right">Avaliação</th><th className="right">Eps</th></tr></thead>
                    <tbody>
                      {[...dramas].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,6).map((d,i)=>(
                        <tr key={i}>
                          <td>
                            <span className="thumb" style={{ background:d.posterGrad||'var(--rs-poster-romance)' }}/>
                            <span className="row-title"><b>{d.title}</b><small>{GENRE_LABELS[d.genre]}</small></span>
                          </td>
                          <td className="right">{fmt(d.views||0)}</td>
                          <td className="right gold">&#9733; {d.rating||'—'}</td>
                          <td className="right">{d.episodes?.length||0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign:'center', padding:'2rem 0', color:'var(--rs-text-muted)', fontSize:'.84rem' }}>Adiciona séries para ver as estatísticas</div>
                )}
              </div>
            </div>
          </>)}

          {/* ══ SÉRIES ══ */}
          {section==='series' && (<>
            {showForm && (
              <div className="modal-bg" onClick={()=>{setShowForm(false);setEditId(null);setFormEps([])}}>
              <div className="modal-box" style={{ maxWidth:780, maxHeight:'90vh', overflowY:'auto' }} onClick={e=>e.stopPropagation()}>
                {/* Header */}
                <div className="modal-hd">
                  <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.1rem' }}>{editId?'Editar Série':'Nova Série'}</div>
                  <button onClick={()=>{setShowForm(false);setEditId(null);setFormEps([])}} style={{ background:'none', border:'none', color:'var(--rs-text-muted)', cursor:'pointer', display:'flex' }}><X size={18}/></button>
                </div>

                {/* Preview strip */}
                <div style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'1rem', background:'var(--rs-bg-cool-3)', borderRadius:12, marginBottom:'1.2rem', border:'1px solid var(--rs-border-soft)' }}>
                  <div style={{ width:64, height:88, borderRadius:10, background:form.posterGrad||'var(--rs-poster-romance)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', flexShrink:0, overflow:'hidden', position:'relative' }}>
                    {form.posterImage && <img src={form.posterImage} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />}
                    {form.icon || '🎬'}
                  </div>
                  <div>
                    <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1rem', marginBottom:'.2rem' }}>{form.title||'Título da série'}</div>
                    <div style={{ fontSize:'.78rem', color:'var(--rs-text-muted)', marginBottom:'.3rem' }}>{form.short||'Sinopse curta...'}</div>
                    <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap' }}>
                      {form.genre && <span style={{ fontSize:'.65rem', background:'rgba(255,56,92,.15)', color:'var(--rs-primary)', padding:'.15rem .5rem', borderRadius:50, fontWeight:700 }}>{GENRE_LABELS[form.genre]}</span>}
                      {form.year && <span style={{ fontSize:'.65rem', color:'var(--rs-text-muted)' }}>{form.year}</span>}
                      {form.badge && <span style={{ fontSize:'.65rem', background:'rgba(255,217,61,.15)', color:'var(--rs-accent)', padding:'.15rem .5rem', borderRadius:50, fontWeight:700 }}>{form.badge}</span>}
                    </div>
                  </div>
                </div>

                {/* Row 1 — main info */}
                <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                  <div><label className="field-lbl">Título *</label><input className="field-in" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Ex: Amor Proibido"/></div>
                  <div><label className="field-lbl">Género *</label>
                    <select className="field-in" value={form.genre} onChange={e=>{ const g=e.target.value as Drama['genre']; setForm(p=>({...p,genre:g,icon:GENRE_ICONS[g][0]})) }}>
                      {GENRES.map(g=><option key={g} value={g}>{GENRE_LABELS[g]}</option>)}
                    </select>
                  </div>
                  <div><label className="field-lbl">Status</label>
                    <select className="field-in" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value as Drama['status']}))}>{['Ativo','Rascunho','Pausado'].map(s=><option key={s}>{s}</option>)}</select>
                  </div>
                  <div><label className="field-lbl">Badge</label>
                    <select className="field-in" value={form.badge} onChange={e=>setForm(p=>({...p,badge:e.target.value}))}>{['','NOVO','HOT','TOP','EXCLUSIVO'].map(b=><option key={b} value={b}>{b||'Nenhum'}</option>)}</select>
                  </div>
                </div>

                {/* Row 2 — numbers */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                  <div><label className="field-lbl">Ano</label><input className="field-in" type="number" min={2000} max={2030} value={form.year} onChange={e=>setForm(p=>({...p,year:e.target.value}))} placeholder="2025"/></div>
                  <div><label className="field-lbl">Visualizações iniciais</label><input className="field-in" type="number" min={0} value={form.views} onChange={e=>setForm(p=>({...p,views:e.target.value}))} placeholder="0"/></div>
                  <div><label className="field-lbl">Rating inicial (0—5)</label><input className="field-in" type="number" min={0} max={5} step={.1} value={form.rating} onChange={e=>setForm(p=>({...p,rating:e.target.value}))} placeholder="4.5"/></div>
                  <div>
                    <label className="field-lbl">Ícone / Emoji</label>
                    <div style={{ display:'flex', gap:4 }}>
                      <input className="field-in" value={form.icon} onChange={e=>setForm(p=>({...p,icon:e.target.value}))} placeholder="💕" style={{ flex:1 }}/>
                    </div>
                    <div style={{ display:'flex', gap:4, marginTop:5, flexWrap:'wrap' }}>
                      {(GENRE_ICONS[form.genre]||[]).map(ic=>(
                        <button key={ic} onClick={()=>setForm(p=>({...p,icon:ic}))} style={{ background:form.icon===ic?'rgba(255,56,92,.2)':'var(--rs-bg-cool-3)', border:`1px solid ${form.icon===ic?'var(--rs-primary)':'var(--rs-border-base)'}`, borderRadius:6, padding:'3px 6px', cursor:'pointer', fontSize:'1rem' }}>{ic}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 3 — descriptions */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                  <div>
                    <label className="field-lbl">Sinopse curta (aparece nos cards)</label>
                    <input className="field-in" value={form.short} onChange={e=>setForm(p=>({...p,short:e.target.value}))} placeholder="Ex: Um amor proibido que desafia tudo..."/>
                  </div>
                  <div>
                    <label className="field-lbl">Elenco (separado por vírgulas)</label>
                    <input className="field-in" value={form.cast} onChange={e=>setForm(p=>({...p,cast:e.target.value}))} placeholder="Ex: Ana Silva, João Santos, Maria Costa"/>
                  </div>
                </div>
                <div style={{ marginBottom:12 }}>
                  <label className="field-lbl">Descrição completa</label>
                  <textarea className="field-in" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={3} placeholder="Descrição detalhada da série..." style={{ resize:'vertical' }}/>
                </div>

                {/* Row 4 — poster image + colour */}
                <div style={{ marginBottom:14 }}>
                  <label className="field-lbl">Imagem da capa (recomendado: 2:3, ex: 600×900px)</label>
                  <ImageUpload
                    images={form.posterImage ? [form.posterImage] : []}
                    onAdd={url => setForm(f=>({...f, posterImage:url}))}
                    onRemove={() => setForm(f=>({...f, posterImage:''}))}
                    folder="banners" browseFolder="banners" single label="Upload da capa (formato vertical 2:3, ex: 600×900px)"
                  />
                </div>

                <div style={{ marginBottom:14 }}>
                  <label className="field-lbl">Imagem de fundo / banner (opcional, formato paisagem 16:9)</label>
                  <ImageUpload
                    images={form.bannerImage ? [form.bannerImage] : []}
                    onAdd={url => setForm(f=>({...f, bannerImage:url}))}
                    onRemove={() => setForm(f=>({...f, bannerImage:''}))}
                    folder="banners" browseFolder="banners" single label="Upload do banner da série (aparece na página de detalhe)"
                  />
                </div>

                <div style={{ marginBottom:14 }}>
                  <label className="field-lbl">Cor do poster (usada quando não há imagem)</label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                    {POSTER_PRESETS.map(p=>(
                      <button key={p.value} onClick={()=>setForm(f=>({...f,posterGrad:p.value}))} title={p.label}
                        style={{ width:44, height:44, borderRadius:10, background:p.value, border:`3px solid ${form.posterGrad===p.value?'#fff':'transparent'}`, cursor:'pointer', flexShrink:0, boxShadow:form.posterGrad===p.value?'0 0 0 2px var(--rs-primary)':'none', transition:'border .15s,box-shadow .15s' }}/>
                    ))}
                  </div>
                </div>

                {/* â"€â"€ Episodes inline â"€â"€ */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <label className="field-lbl" style={{ margin:0 }}>
                      Episódios ({formEps.length})
                      {formEps.filter(e=>e.free).length > 0 && <span style={{ color:'#22c55e', marginLeft:6 }}>{formEps.filter(e=>e.free).length} grátis</span>}
                    </label>
                    <div style={{ display:'flex', gap:6 }}>
                      <button type="button" onClick={()=>setFormEps(p=>[...p,{title:'',url:'',free:p.length<2}])}
                        style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,56,92,.15)', border:'1px solid rgba(255,56,92,.3)', color:'var(--rs-primary)', borderRadius:8, padding:'.3rem .75rem', fontSize:'.78rem', fontWeight:700, cursor:'pointer' }}>
                        <Plus size={13}/> Adicionar episódio
                      </button>
                      {formEps.length > 0 && (
                        <button type="button" onClick={()=>setFormEps(p=>[...p,{title:'',url:'',free:false},{title:'',url:'',free:false},{title:'',url:'',free:false},{title:'',url:'',free:false},{title:'',url:'',free:false}])}
                          style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,.06)', border:'1px solid var(--rs-border-base)', color:'var(--rs-text-muted)', borderRadius:8, padding:'.3rem .75rem', fontSize:'.78rem', cursor:'pointer' }}>
                          +5 de uma vez
                        </button>
                      )}
                    </div>
                  </div>

                  {formEps.length === 0 ? (
                    <div style={{ border:'2px dashed var(--rs-border-base)', borderRadius:10, padding:'1.2rem', textAlign:'center', color:'var(--rs-text-muted)', fontSize:'.84rem' }}>
                      Clica em "Adicionar episódio" para começar · Os episódios podem ser adicionados depois também
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {/* Column headers */}
                      <div style={{ display:'grid', gridTemplateColumns:'32px 1fr 160px 70px 30px', gap:8, padding:'0 6px' }}>
                        <span className="field-lbl" style={{ margin:0, textAlign:'center' }}>#</span>
                        <span className="field-lbl" style={{ margin:0 }}>Título do episódio</span>
                        <span className="field-lbl" style={{ margin:0 }}>YouTube ID / URL</span>
                        <span className="field-lbl" style={{ margin:0, textAlign:'center' }}>Grátis</span>
                        <span/>
                      </div>
                      {formEps.map((ep,i)=>(
                        <div key={i} style={{ display:'grid', gridTemplateColumns:'32px 1fr 160px 70px 30px', gap:8, alignItems:'center', background:i%2===0?'rgba(255,255,255,.02)':'transparent', borderRadius:8, padding:'4px 6px' }}>
                          {/* Number */}
                          <div style={{ width:28, height:28, borderRadius:6, background: ep.free?'rgba(34,197,94,.2)':'var(--rs-bg-cool-3)', border:`1px solid ${ep.free?'rgba(34,197,94,.4)':'var(--rs-border-base)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.78rem', fontWeight:700, color:ep.free?'#22c55e':'var(--rs-text-muted)', flexShrink:0 }}>
                            {i+1}
                          </div>
                          {/* Title */}
                          <input
                            className="field-in"
                            value={ep.title}
                            onChange={e=>setFormEps(p=>p.map((x,j)=>j===i?{...x,title:e.target.value}:x))}
                            placeholder={`Ep. ${i+1} — título`}
                            style={{ padding:'.45rem .7rem' }}
                          />
                          {/* YT ID */}
                          <input
                            className="field-in"
                            value={ep.url}
                            onChange={e=>setFormEps(p=>p.map((x,j)=>j===i?{...x,url:e.target.value}:x))}
                            placeholder="ID ou URL"
                            style={{ padding:'.45rem .7rem', fontFamily:'monospace', fontSize:'.78rem' }}
                          />
                          {/* Free toggle */}
                          <div style={{ display:'flex', justifyContent:'center' }}>
                            <label style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}>
                              <input type="checkbox" checked={ep.free} onChange={e=>setFormEps(p=>p.map((x,j)=>j===i?{...x,free:e.target.checked}:x))} style={{ accentColor:'var(--rs-primary)', width:15, height:15 }}/>
                              <span style={{ fontSize:'.72rem', color:ep.free?'#22c55e':'var(--rs-text-muted)' }}>{ep.free?'Sim':'Não'}</span>
                            </label>
                          </div>
                          {/* Remove */}
                          <button type="button" onClick={()=>setFormEps(p=>p.filter((_,j)=>j!==i))}
                            style={{ background:'none', border:'none', color:'rgba(239,68,68,.6)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:2 }}>
                            <X size={14}/>
                          </button>
                        </div>
                      ))}

                      {/* Quick actions */}
                      <div style={{ display:'flex', gap:6, padding:'4px 6px', flexWrap:'wrap' }}>
                        <button type="button" onClick={()=>setFormEps(p=>p.map((x,i)=>({...x,free:i<2})))}
                          style={{ background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.3)', color:'#22c55e', borderRadius:6, padding:'.25rem .65rem', fontSize:'.72rem', fontWeight:700, cursor:'pointer' }}>
                          Primeiros 2 grátis
                        </button>
                        <button type="button" onClick={()=>setFormEps(p=>p.map(x=>({...x,free:true})))}
                          style={{ background:'rgba(255,255,255,.05)', border:'1px solid var(--rs-border-base)', color:'var(--rs-text-muted)', borderRadius:6, padding:'.25rem .65rem', fontSize:'.72rem', cursor:'pointer' }}>
                          Todos grátis
                        </button>
                        <button type="button" onClick={()=>setFormEps(p=>p.map(x=>({...x,free:false})))}
                          style={{ background:'rgba(255,255,255,.05)', border:'1px solid var(--rs-border-base)', color:'var(--rs-text-muted)', borderRadius:6, padding:'.25rem .65rem', fontSize:'.72rem', cursor:'pointer' }}>
                          Todos pagos
                        </button>
                        <span style={{ marginLeft:'auto', fontSize:'.75rem', color:'var(--rs-text-muted)', alignSelf:'center' }}>
                          {formEps.filter(e=>e.title.trim()&&e.url.trim()).length}/{formEps.length} completos
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button onClick={handleSaveDrama} disabled={saving||!form.title.trim()} className="btn-primary" style={{ opacity:(saving||!form.title.trim())?.5:1 }}>
                    <Save size={14}/>{saving?'A guardar...':editId?'Actualizar série':`Criar série${formEps.length>0?` + ${formEps.filter(e=>e.title.trim()&&e.url.trim()).length} eps`:''}`}
                  </button>
                  <button onClick={()=>{setShowForm(false);setEditId(null);setFormEps([])}} className="btn-ghost">Cancelar</button>
                  {editId && <span style={{ fontSize:'.75rem', color:'var(--rs-text-muted)', marginLeft:'auto' }}>A editar série existente</span>}
                </div>
              </div>
              </div>
            )}
            {/* Filtros e info de ordenação */}
            <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap', alignItems:'center' }}>
              {(['Ativo','Rascunho','Pausado'] as const).map(s=>(
                <button key={s}
                  onClick={()=>setSearch(search===s?'':s)}
                  style={{ background:search===s?'rgba(255,56,92,.2)':'rgba(255,255,255,.06)', border:`1px solid ${search===s?'var(--rs-primary)':'var(--rs-border-base)'}`, color:search===s?'var(--rs-primary)':'var(--rs-text-muted)', borderRadius:20, padding:'.28rem .8rem', fontSize:'.78rem', fontWeight:700, cursor:'pointer' }}>
                  {s} ({dramas.filter(d=>d.status===s).length})
                </button>
              ))}
              <span style={{ marginLeft:'auto', fontSize:'.76rem', color:'var(--rs-text-muted)' }}>
                {filteredDramas.length}/{dramas.length} · ordenado por <b style={{ color:'var(--rs-text)' }}>{({title:'Título',episodes:'Episódios',rating:'Rating',views:'Views',status:'Status',createdAt:'Data'} as any)[dramaSort]}</b> {dramaSortDir==='asc'?'↑':'↓'}
              </span>
            </div>
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table>
                <thead><tr>
                  {([
                    ['title','Série'],['status','Status'],['rating','Rating'],['views','Views'],['episodes','Eps'],
                  ] as [typeof dramaSort, string][]).map(([col,label])=>(
                    <th key={col} onClick={()=>toggleSort(col)} style={{ cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' }}>
                      {label} {dramaSort===col ? (dramaSortDir==='asc'?'↑':'↓') : <span style={{ opacity:.3 }}>↕</span>}
                    </th>
                  ))}
                  <th>Acções</th>
                </tr></thead>
                <tbody>
                  {(filteredDramas.length>0?filteredDramas:MOCK_DRAMAS.map(d=>({...d,_id:d.id})) as (Drama&{_id:string})[]).map((d,i)=>(
                    <tr key={d._id||i}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:'.7rem' }}>
                          <span style={{ width:32, height:44, borderRadius:6, background:d.posterGrad||'var(--rs-poster-romance)', display:'inline-block', flexShrink:0 }}/>
                          <div><div style={{ fontSize:'.85rem', fontWeight:700 }}>{d.title}</div><div style={{ fontSize:'.7rem', color:'var(--rs-text-muted)' }}>{(d.description||'').slice(0,40)}{(d.description?.length||0)>40?'...':''}</div></div>
                        </div>
                      </td>
                      <td>{statusBadge(d.status)}</td>
                      <td className="gold">★ {d.rating?.toFixed(1)}</td>
                      <td style={{ color:'var(--rs-text-muted)', fontSize:'.82rem' }}>{fmt(d.views||0)}</td>
                      <td style={{ color:'var(--rs-text-muted)' }}>{d.episodes?.length||0}</td>
                      <td><div style={{ display:'flex', gap:5 }}>
                        <button title="Episódios" onClick={()=>openEpisodes(d)} className="act-btn" style={{ background:'rgba(59,130,246,.15)', color:'#3b82f6' }}><List size={13}/></button>
                        <button title="Editar" onClick={()=>{
                          const dd = d as any
                          setForm({
                            title:       d.title || '',
                            genre:       (d.genre?.toLowerCase() as Drama['genre']) || 'romance',
                            description: d.description || dd.desc || '',
                            short:       dd.short || '',
                            status:      d.status || 'Ativo',
                            rating:      String(d.rating ?? 4.5),
                            badge:       d.badge || '',
                            year:        String(dd.year || new Date().getFullYear()),
                            cast:        (dd.cast||[]).join(', '),
                            views:       String(d.views || 0),
                            icon:        dd.icon || '🎬',
                            posterGrad:  d.posterGrad || dd.grad || '',
                            posterImage: dd.posterImage || '',
                            bannerImage: dd.bannerImage || '',
                          })
                          setEditId(d._id)
                          setShowForm(true)
                        }} className="act-btn"><Edit2 size={13}/></button>
                        <button title="Eliminar" onClick={()=>handleDelete(d._id,d.title)} className="act-btn" style={{ background:'rgba(239,68,68,.12)', color:'#ef4444' }}><Trash2 size={13}/></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>)}

          {/* ══ UTILIZADORES ══ */}
          {section==='utilizadores' && (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table>
                <thead><tr><th>Utilizador</th><th>Email</th><th>Plano</th><th>Pontos</th><th>Status</th><th>Acções</th></tr></thead>
                <tbody>
                  {filteredUsers.length>0 ? filteredUsers.map((u,i)=>(
                    <tr key={u._id||i}>
                      <td><div style={{ display:'flex', alignItems:'center', gap:'.7rem' }}>
                        <div style={{ width:34, height:34, borderRadius:10, background:'var(--rs-grad-hero)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, flexShrink:0 }}>{(u.name||'U')[0].toUpperCase()}</div>
                        <span style={{ fontWeight:600 }}>{u.name}</span>
                      </div></td>
                      <td style={{ color:'var(--rs-text-muted)' }}>{u.email}</td>
                      <td>{u.plan}</td>
                      <td className="gold">{fmt(u.coins||0)}</td>
                      <td>{statusBadge(u.status)}</td>
                      <td><div style={{ display:'flex', gap:5 }}>
                        <button title="Dar/retirar pontos" onClick={()=>{setCoinUser(u);setCoinAmt('');setCoinMode('dar')}} className="act-btn" style={{ background:'rgba(255,217,61,.12)', color:'var(--rs-accent)' }}><Gift size={13}/></button>
                        <button title={u.status==='Ativo'?'Suspender':'Activar'} onClick={()=>handleToggleStatus(u)} className="act-btn" style={{ background:u.status==='Ativo'?'rgba(239,68,68,.12)':'rgba(34,197,94,.12)', color:u.status==='Ativo'?'#ef4444':'#22c55e' }}>
                          {u.status==='Ativo'?<XCircle size={13}/>:<CheckCircle size={13}/>}
                        </button>
                      </div></td>
                    </tr>
                  )) : <tr><td colSpan={6} style={{ textAlign:'center', padding:'3rem', color:'var(--rs-text-muted)' }}>Nenhum utilizador ainda.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ══ EPISÓDIOS ══ */}
          {section==='episodios' && (() => {
            const allDramaList = dramas.length>0?dramas:MOCK_DRAMAS.map(d=>({...d,_id:d.id})) as (Drama&{_id:string})[]
            const allEps = allDramaList.flatMap(d=>(d.episodes||[]).map(e=>({...e,dramaId:d._id,dramaTitle:d.title,posterGrad:d.posterGrad})))
              .filter(e=>!epFilter||e.dramaId===epFilter)
              .filter(e=>!search||e.title.toLowerCase().includes(search.toLowerCase()))
            return (<>
              <div style={{ display:'flex', gap:10, marginBottom:'1rem', flexWrap:'wrap' }}>
                <select className="field-in" style={{ width:'auto', minWidth:200 }} value={epFilter} onChange={e=>setEpFilter(e.target.value)}>
                  <option value="">Todas as séries ({allDramaList.reduce((s,d)=>s+(d.episodes?.length||0),0)} eps)</option>
                  {allDramaList.map(d=><option key={d._id} value={d._id}>{d.title} ({d.episodes?.length||0} eps)</option>)}
                </select>
                <span style={{ alignSelf:'center', fontSize:'.84rem', color:'var(--rs-text-muted)' }}>{allEps.length} episódios encontrados</span>
              </div>
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                <table>
                  <thead><tr><th>Série</th><th>#</th><th>Título</th><th>URL do Vídeo</th><th>Grátis</th><th>Acções</th></tr></thead>
                  <tbody>
                    {allEps.length===0
                      ? <tr><td colSpan={6} style={{ textAlign:'center', padding:'3rem', color:'var(--rs-text-muted)' }}>Nenhum episódio encontrado.</td></tr>
                      : allEps.map((ep,i)=> inlineEp?.epId===ep.id && inlineEp?.dramaId===ep.dramaId ? (
                        <tr key={i} style={{ background:'rgba(255,56,92,.05)' }}>
                          <td style={{ color:'var(--rs-text-muted)', fontSize:'.78rem' }}>{ep.dramaTitle}</td>
                          <td style={{ color:'var(--rs-text-muted)' }}>{ep.order}</td>
                          <td><input className="field-in" value={inlineEpForm.title} onChange={e=>setInlineEpForm(p=>({...p,title:e.target.value}))} style={{ padding:'.35rem .6rem' }}/></td>
                          <td><input className="field-in" value={inlineEpForm.url} onChange={e=>setInlineEpForm(p=>({...p,url:e.target.value}))} placeholder="https://res.cloudinary.com/..." style={{ padding:'.35rem .6rem', fontFamily:'monospace', fontSize:'.8rem' }}/></td>
                          <td><label style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}><input type="checkbox" checked={inlineEpForm.free} onChange={e=>setInlineEpForm(p=>({...p,free:e.target.checked}))} style={{ accentColor:'var(--rs-primary)' }}/><span style={{ fontSize:'.78rem', color:inlineEpForm.free?'#22c55e':'var(--rs-text-muted)' }}>{inlineEpForm.free?'Sim':'Não'}</span></label></td>
                          <td><div style={{ display:'flex', gap:5 }}>
                            <button onClick={saveInlineEp} className="act-btn" style={{ background:'rgba(34,197,94,.15)', color:'#22c55e', width:'auto', padding:'0 .6rem', gap:4, fontSize:'.75rem', fontWeight:700 }}><Save size={11}/>Guardar</button>
                            <button onClick={()=>setInlineEp(null)} className="act-btn"><X size={13}/></button>
                          </div></td>
                        </tr>
                      ) : (
                        <tr key={i}>
                          <td><div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}><span style={{ width:28, height:38, borderRadius:4, background:ep.posterGrad||'var(--rs-poster-romance)', display:'inline-block', flexShrink:0 }}/><span style={{ fontSize:'.83rem', fontWeight:600 }}>{ep.dramaTitle}</span></div></td>
                          <td style={{ color:'var(--rs-text-muted)', fontWeight:700 }}>{ep.order}</td>
                          <td style={{ fontWeight:500 }}>{ep.title}</td>
                          <td><a href={ep.url||ep.ytId||'#'} target="_blank" rel="noopener" style={{ color:'#3b82f6', fontFamily:'monospace', fontSize:'.75rem', textDecoration:'none', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', display:'block', whiteSpace:'nowrap' }}>{ep.url ? ep.url.split('/').slice(-2).join('/') : (ep.ytId||'—')}</a></td>
                          <td>{ep.free ? <span className="badge b-green">Grátis</span> : <span style={{ color:'var(--rs-text-muted)', fontSize:'.78rem' }}>Pago</span>}</td>
                          <td><div style={{ display:'flex', gap:5 }}>
                            <button onClick={()=>{setInlineEp({dramaId:ep.dramaId,epId:ep.id||''}); setInlineEpForm({title:ep.title,url:ep.url??ep.ytId??'',free:ep.free})}} className="act-btn"><Edit2 size={13}/></button>
                            <button onClick={()=>deleteEpFromDrama(ep.dramaId,ep.id||'')} className="act-btn" style={{ background:'rgba(239,68,68,.12)', color:'#ef4444' }}><Trash2 size={13}/></button>
                          </div></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </>)
          })()}

          {/* ══ ENCOMENDAS ══ */}
          {section==='encomendas' && (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table>
                <thead><tr><th>Utilizador</th><th>Pacote</th><th>Pontos</th><th>Valor</th><th>Estado</th><th>Acções</th></tr></thead>
                <tbody>
                  {filteredOrders.length>0 ? filteredOrders.map((o,i)=>(
                    <tr key={o._id||i}>
                      <td><div style={{ fontWeight:600 }}>{o.userName}</div><div style={{ fontSize:'.72rem', color:'var(--rs-text-muted)' }}>{o.userEmail}</div></td>
                      <td>{o.package}</td>
                      <td className="gold">{fmt(o.points||0)} pts</td>
                      <td className="gold">Kz {fmt(parseFloat((o.amount||'0').replace(/\D/g,'')))}</td>
                      <td>{statusBadge(o.status)}</td>
                      <td>{o.status==='Pendente'?(
                        <div style={{ display:'flex', gap:5 }}>
                          <button onClick={()=>handleOrderStatus(o,'Aprovado')} className="act-btn" style={{ background:'rgba(34,197,94,.15)', color:'#22c55e', width:'auto', padding:'0 .6rem', gap:4, fontSize:'.75rem', fontWeight:700 }}><CheckCircle size={11}/>Aprovar</button>
                          <button onClick={()=>handleOrderStatus(o,'Rejeitado')} className="act-btn" style={{ background:'rgba(239,68,68,.12)', color:'#ef4444', width:'auto', padding:'0 .6rem', gap:4, fontSize:'.75rem', fontWeight:700 }}><XCircle size={11}/>Rejeitar</button>
                        </div>
                      ):<span style={{ color:'var(--rs-text-muted)', fontSize:'.78rem' }}>—</span>}</td>
                    </tr>
                  )) : <tr><td colSpan={6} style={{ textAlign:'center', padding:'3rem', color:'var(--rs-text-muted)' }}>Nenhuma encomenda ainda.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ══ AVALIAÇÕES ══ */}
          {section==='avaliacoes' && (() => {
            const byDrama: Record<string,{dramaId:string;count:number;total:number;dist:Record<number,number>}> = {}
            ratings.forEach(r=>{
              if (!byDrama[r.dramaId]) byDrama[r.dramaId]={dramaId:r.dramaId,count:0,total:0,dist:{1:0,2:0,3:0,4:0,5:0}}
              byDrama[r.dramaId].count++; byDrama[r.dramaId].total+=r.rating
              if (byDrama[r.dramaId].dist[r.rating]!==undefined) byDrama[r.dramaId].dist[r.rating]++
            })
            const allDramas = dramas.length>0?dramas:MOCK_DRAMAS.map(d=>({...d,_id:d.id})) as (Drama&{_id:string})[]
            const summaries = Object.values(byDrama).sort((a,b)=>b.count-a.count)
            const getDramaTitle = (id:string) => allDramas.find(d=>d.id===id||d._id===id)?.title||id
            return (<>
              <div style={{ marginBottom:'1.5rem' }}>
                {summaries.length===0 ? (
                  <div className="card" style={{ textAlign:'center', padding:'3rem', color:'var(--rs-text-muted)' }}>Nenhuma avaliação ainda.</div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem' }}>
                    {summaries.map(s=>{
                      const avg=s.count>0?Math.round(s.total/s.count*10)/10:0
                      return (
                        <div key={s.dramaId} className="card">
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'.8rem' }}>
                            <div><div style={{ fontWeight:700, marginBottom:'.3rem' }}>{getDramaTitle(s.dramaId)}</div>
                              <div style={{ display:'flex', alignItems:'center', gap:'.4rem' }}>
                                <span style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.5rem', color:'var(--rs-accent)', lineHeight:1 }}>{avg.toFixed(1)}</span>
                                <span style={{ fontSize:'.72rem', color:'var(--rs-text-muted)' }}>{s.count} votos</span>
                              </div>
                            </div>
                            <button onClick={()=>resetDramaRatings(s.dramaId,getDramaTitle(s.dramaId))} className="act-btn" style={{ background:'rgba(239,68,68,.12)', color:'#ef4444', width:'auto', padding:'0 .6rem', fontSize:'.72rem', fontWeight:700 }}>Resetar</button>
                          </div>
                          {[5,4,3,2,1].map(star=>{
                            const cnt=s.dist[star]||0; const pct=s.count>0?(cnt/s.count)*100:0
                            return <div key={star} style={{ display:'flex', alignItems:'center', gap:'.4rem', marginBottom:3 }}>
                              <span style={{ fontSize:'.7rem', color:'var(--rs-text-muted)', width:8 }}>{star}</span>
                              <div style={{ flex:1, height:5, background:'var(--rs-border-soft)', borderRadius:3 }}><div style={{ height:'100%', width:`${pct}%`, background:'var(--rs-accent)', borderRadius:3 }}/></div>
                              <span style={{ fontSize:'.68rem', color:'var(--rs-text-muted)', width:18 }}>{cnt}</span>
                            </div>
                          })}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              {ratings.length>0 && (
                <div className="card" style={{ padding:0, overflow:'hidden' }}>
                  <div style={{ padding:'1rem 1.2rem', borderBottom:'1px solid var(--rs-border-soft)', fontWeight:700 }}>Avaliações recentes</div>
                  <table>
                    <thead><tr><th>Série</th><th>Utilizador</th><th>Nota</th><th>Data</th></tr></thead>
                    <tbody>{ratings.slice(0,20).map((r,i)=>(
                      <tr key={r._id||i}>
                        <td style={{ fontWeight:600 }}>{getDramaTitle(r.dramaId)}</td>
                        <td style={{ color:'var(--rs-text-muted)', fontFamily:'monospace', fontSize:'.75rem' }}>{r.userId.slice(0,14)}…</td>
                        <td><div style={{ display:'flex', gap:2 }}>{[1,2,3,4,5].map(n=>(
                          <svg key={n} width={13} height={13} viewBox="0 0 24 24" fill={n<=r.rating?'#FFD93D':'none'} stroke={n<=r.rating?'#FFD93D':'rgba(255,255,255,.2)'} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        ))}</div></td>
                        <td style={{ color:'var(--rs-text-muted)', fontSize:'.78rem' }}>{r.updatedAt?new Date(r.updatedAt.seconds*1000).toLocaleDateString('pt-AO'):'—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </>)
          })()}

          {/* ══ PACOTES DE PONTOS ══ */}
          {section==='pacotes' && (<>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem', marginBottom:'1.5rem' }}>
              {pkgs.map((pkg,i)=>{
                const editing = pkgEditId===pkg._id
                const stripes = ['var(--rs-grad-purple)','var(--rs-grad-hero)','var(--rs-grad-gold)','var(--rs-grad-violet)']
                return (
                  <div key={pkg._id} className="card" style={{ position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:stripes[i]||stripes[0], borderRadius:'16px 16px 0 0' }}/>
                    {!editing ? (<>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'.8rem', marginTop:'.4rem' }}>
                        <div>
                          <div style={{ fontSize:'.72rem', color:'var(--rs-text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px' }}>{pkg.name}</div>
                          {pkg.badge && <span className="badge b-yellow" style={{ marginTop:4, display:'inline-block' }}>{pkg.badge}</span>}
                        </div>
                        <button onClick={()=>{setPkgEditId(pkg._id);setPkgForm({name:pkg.name,pts:String(pkg.pts),bonus:String(pkg.bonus),priceKz:String(pkg.priceKz),badge:pkg.badge||''})}} className="act-btn"><Edit2 size={13}/></button>
                      </div>
                      <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'2.2rem', color:'var(--rs-accent)', lineHeight:1, marginBottom:'.3rem' }}>{fmt(pkg.pts+pkg.bonus)}</div>
                      <div style={{ fontSize:'.78rem', color:'var(--rs-text-muted)', marginBottom:'.8rem' }}>
                        pontos{pkg.bonus>0 && <span style={{ color:'#22c55e', marginLeft:4 }}>+{fmt(pkg.bonus)} bónus</span>}
                      </div>
                      <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.3rem' }}>Kz {fmt(pkg.priceKz)}</div>
                      <div style={{ fontSize:'.72rem', color:'var(--rs-text-muted)', marginTop:'.3rem' }}>Kz {(pkg.priceKz/(pkg.pts+pkg.bonus||1)).toFixed(1)} por ponto</div>
                    </>) : (<>
                      <div style={{ marginTop:'.4rem', marginBottom:'.8rem', fontFamily:'var(--rs-font-display)', fontWeight:900 }}>Editar Pacote</div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                        <div><label className="field-lbl">Nome</label><input className="field-in" value={pkgForm.name} onChange={e=>setPkgForm(p=>({...p,name:e.target.value}))} style={{ padding:'.4rem .6rem' }}/></div>
                        <div><label className="field-lbl">Badge</label><input className="field-in" value={pkgForm.badge} onChange={e=>setPkgForm(p=>({...p,badge:e.target.value}))} placeholder="Ex: Mais Popular" style={{ padding:'.4rem .6rem' }}/></div>
                        <div><label className="field-lbl">Pontos base</label><input className="field-in" type="number" value={pkgForm.pts} onChange={e=>setPkgForm(p=>({...p,pts:e.target.value}))} style={{ padding:'.4rem .6rem' }}/></div>
                        <div><label className="field-lbl">Bónus</label><input className="field-in" type="number" value={pkgForm.bonus} onChange={e=>setPkgForm(p=>({...p,bonus:e.target.value}))} style={{ padding:'.4rem .6rem' }}/></div>
                        <div style={{ gridColumn:'1/-1' }}><label className="field-lbl">Preço (Kz)</label><input className="field-in" type="number" value={pkgForm.priceKz} onChange={e=>setPkgForm(p=>({...p,priceKz:e.target.value}))} style={{ padding:'.4rem .6rem' }}/></div>
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={handleSavePkg} disabled={pkgSaving} className="btn-primary" style={{ flex:1, justifyContent:'center', padding:'.5rem', fontSize:'.82rem' }}><Save size={13}/>{pkgSaving?'...':'Guardar'}</button>
                        <button onClick={()=>setPkgEditId(null)} className="btn-ghost" style={{ flex:1, justifyContent:'center', padding:'.5rem', fontSize:'.82rem' }}>Cancelar</button>
                      </div>
                    </>)}
                  </div>
                )
              })}
            </div>
            <div className="card" style={{ background:'rgba(255,217,61,.05)', border:'1px solid rgba(255,217,61,.15)' }}>
              <div style={{ fontSize:'.84rem', color:'var(--rs-text-muted)', lineHeight:1.6 }}>
                <strong style={{ color:'var(--rs-accent)' }}>Nota:</strong> As alterações são guardadas no Firestore. Os URLs de pagamento Kursinha são configurados nas variáveis de ambiente do Vercel (<code style={{ background:'rgba(255,255,255,.06)', padding:'1px 5px', borderRadius:4 }}>NEXT_PUBLIC_KURSINHA_*_URL</code>).
              </div>
            </div>
          </>)}

          {/* ══ CAMPANHAS ══ */}
          {section==='campanhas' && (<>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
              <button onClick={()=>{setCampForm(emptyCamp());setCampEditId(null);setShowCampForm(true)}} className="btn-primary"><Plus size={15}/>Nova campanha</button>
            </div>
            {showCampForm && (
              <div className="card" style={{ marginBottom:'1.2rem', border:'1px solid var(--rs-border-strong)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
                  <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1rem' }}>{campEditId?'Editar Campanha':'Nova Campanha'}</div>
                  <button onClick={()=>{setShowCampForm(false);setCampEditId(null)}} style={{ background:'none', border:'none', color:'var(--rs-text-muted)', cursor:'pointer', display:'flex' }}><X size={18}/></button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                  <div style={{ gridColumn:'1/-1' }}><label className="field-lbl">Título</label><input className="field-in" value={campForm.title} onChange={e=>setCampForm(p=>({...p,title:e.target.value}))} placeholder="Ex: Promoção de Verão"/></div>
                  <div><label className="field-lbl">Tipo</label>
                    <select className="field-in" value={campForm.type} onChange={e=>setCampForm(p=>({...p,type:e.target.value as any}))}>
                      <option value="banner">Banner / Destaque</option>
                      <option value="desconto">Desconto (%)</option>
                      <option value="bonus">Bónus de Pontos</option>
                    </select>
                  </div>
                  <div><label className="field-lbl">{campForm.type==='banner'?'Destaque (texto)':campForm.type==='desconto'?'Desconto (%)':'Bónus (pts)'}</label><input className="field-in" value={campForm.value} onChange={e=>setCampForm(p=>({...p,value:e.target.value}))} placeholder={campForm.type==='banner'?'Ex: Novo conteúdo!':campForm.type==='desconto'?'Ex: 20':'Ex: 100'}/></div>
                  <div><label className="field-lbl">Alvo</label>
                    <select className="field-in" value={campForm.target} onChange={e=>setCampForm(p=>({...p,target:e.target.value as any}))}>
                      <option value="todos">Todos os utilizadores</option>
                      <option value="novos">Novos utilizadores</option>
                      <option value="vip">Utilizadores VIP</option>
                    </select>
                  </div>
                  <div><label className="field-lbl">Data início</label><input className="field-in" type="date" value={campForm.startDate} onChange={e=>setCampForm(p=>({...p,startDate:e.target.value}))} style={{ colorScheme:'dark' }}/></div>
                  <div><label className="field-lbl">Data fim</label><input className="field-in" type="date" value={campForm.endDate} onChange={e=>setCampForm(p=>({...p,endDate:e.target.value}))} style={{ colorScheme:'dark' }}/></div>
                  <div style={{ gridColumn:'1/-1' }}><label className="field-lbl">Descrição</label><textarea className="field-in" value={campForm.description} onChange={e=>setCampForm(p=>({...p,description:e.target.value}))} rows={2} style={{ resize:'vertical' }} placeholder="Descrição da campanha..."/></div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={handleSaveCamp} disabled={campSaving||!campForm.title.trim()} className="btn-primary" style={{ opacity:(campSaving||!campForm.title.trim())?.5:1 }}><Save size={14}/>{campSaving?'A guardar...':'Guardar'}</button>
                  <button onClick={()=>{setShowCampForm(false);setCampEditId(null)}} className="btn-ghost">Cancelar</button>
                </div>
              </div>
            )}
            {campaigns.length===0 ? (
              <div className="card" style={{ textAlign:'center', padding:'3rem', color:'var(--rs-text-muted)' }}>Nenhuma campanha criada ainda.</div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'1rem' }}>
                {campaigns.map(c=>(
                  <div key={c._id} className="card" style={{ border:`1px solid ${c.active?'rgba(255,56,92,.2)':'var(--rs-border-soft)'}`, opacity:c.active?1:.65 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'.6rem' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'.9rem', marginBottom:'.2rem' }}>{c.title}</div>
                        <div style={{ display:'flex', gap:6 }}>
                          <span className={`badge ${c.type==='banner'?'b-blue':c.type==='desconto'?'b-yellow':'b-green'}`}>{c.type==='banner'?'Banner':c.type==='desconto'?`-${c.value}%`:`+${c.value} pts`}</span>
                          <span className="badge" style={{ background:'rgba(255,255,255,.06)', color:'var(--rs-text-muted)' }}>{c.target}</span>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:5 }}>
                        <button onClick={()=>handleToggleCamp(c)} className="act-btn" style={{ background:c.active?'rgba(34,197,94,.12)':'rgba(255,255,255,.06)', color:c.active?'#22c55e':'var(--rs-text-muted)' }} title={c.active?'Desactivar':'Activar'}>
                          {c.active?<ToggleRight size={15}/>:<ToggleLeft size={15}/>}
                        </button>
                        <button onClick={()=>{setCampForm({title:c.title,description:c.description,type:c.type,value:c.value,startDate:c.startDate,endDate:c.endDate,active:c.active,target:c.target});setCampEditId(c._id);setShowCampForm(true)}} className="act-btn"><Edit2 size={13}/></button>
                        <button onClick={()=>handleDeleteCamp(c._id)} className="act-btn" style={{ background:'rgba(239,68,68,.12)', color:'#ef4444' }}><Trash2 size={13}/></button>
                      </div>
                    </div>
                    {c.description && <div style={{ fontSize:'.78rem', color:'var(--rs-text-muted)', marginBottom:'.5rem', lineHeight:1.5 }}>{c.description}</div>}
                    {(c.startDate||c.endDate) && <div style={{ fontSize:'.72rem', color:'var(--rs-text-muted)' }}>{c.startDate} → {c.endDate||'sem fim'}</div>}
                  </div>
                ))}
              </div>
            )}
          </>)}

          {/* ══ NOTIFICAÇÕES PUSH ══ */}
          {section==='notificacoes' && (<>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
              {/* Send form */}
              <div className="card">
                <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1rem', marginBottom:'1.2rem' }}>Enviar notificação push</div>
                <div style={{ marginBottom:10 }}><label className="field-lbl">Título *</label><input className="field-in" value={notifForm.title} onChange={e=>setNotifForm(p=>({...p,title:e.target.value}))} placeholder="Ex: Novo episódio disponível!"/></div>
                <div style={{ marginBottom:10 }}><label className="field-lbl">Mensagem *</label><textarea className="field-in" value={notifForm.body} onChange={e=>setNotifForm(p=>({...p,body:e.target.value}))} rows={3} placeholder="Ex: O episódio 5 de Amor em Segredo já está disponível!" style={{ resize:'vertical' }}/></div>
                <div style={{ marginBottom:'1.2rem' }}><label className="field-lbl">Link (opcional)</label><input className="field-in" value={notifForm.url} onChange={e=>setNotifForm(p=>({...p,url:e.target.value}))} placeholder="Ex: /detalhe?id=7"/></div>
                <div style={{ padding:'1rem', background:'rgba(255,217,61,.06)', border:'1px solid rgba(255,217,61,.15)', borderRadius:10, marginBottom:'1rem', fontSize:'.82rem', color:'var(--rs-text-muted)', lineHeight:1.6 }}>
                  <strong style={{ color:'var(--rs-accent)' }}>Alcance estimado:</strong> {users.length} utilizadores registados
                  {users.filter(u=>(u as any).fcmToken).length > 0 && ` · ${users.filter(u=>(u as any).fcmToken).length} com notificações activas`}
                </div>
                <button onClick={handleSendNotif} disabled={notifSending||!notifForm.title.trim()||!notifForm.body.trim()} className="btn-primary" style={{ width:'100%', justifyContent:'center', opacity:(notifSending||!notifForm.title.trim()||!notifForm.body.trim())?.5:1 }}>
                  <Send size={14}/>{notifSending?'A enviar...':'Enviar notificação'}
                </button>
              </div>
              {/* Preview */}
              <div>
                <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1rem', marginBottom:'1.2rem', color:'var(--rs-text-muted)' }}>Pré-visualização</div>
                <div style={{ background:'var(--rs-bg-cool-3)', borderRadius:16, padding:'1rem', border:'1px solid var(--rs-border-base)', marginBottom:'1.5rem' }}>
                  <div style={{ display:'flex', gap:'.75rem', alignItems:'flex-start' }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:'var(--rs-grad-hero)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'.9rem' }}>RS</div>
                    <div>
                      <div style={{ fontSize:'.84rem', fontWeight:700, marginBottom:'.2rem' }}>{notifForm.title||'Título da notificação'}</div>
                      <div style={{ fontSize:'.78rem', color:'var(--rs-text-muted)', lineHeight:1.4 }}>{notifForm.body||'Mensagem da notificação aparece aqui...'}</div>
                      {notifForm.url && <div style={{ fontSize:'.72rem', color:'var(--rs-primary)', marginTop:'.3rem' }}>→ {notifForm.url}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* History */}
            {notifs.length>0 && (
              <div className="card" style={{ padding:0, overflow:'hidden', marginTop:'1rem' }}>
                <div style={{ padding:'1rem 1.2rem', borderBottom:'1px solid var(--rs-border-soft)', fontWeight:700 }}>Histórico de notificações ({notifs.length})</div>
                <table>
                  <thead><tr><th>Título</th><th>Mensagem</th><th>Link</th><th>Alcance</th><th>Data</th></tr></thead>
                  <tbody>
                    {notifs.map((n,i)=>(
                      <tr key={n._id||i}>
                        <td style={{ fontWeight:600, maxWidth:150 }}>{n.title}</td>
                        <td style={{ color:'var(--rs-text-muted)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.body}</td>
                        <td style={{ color:'var(--rs-primary)', fontSize:'.78rem' }}>{n.url||'—'}</td>
                        <td className="gold">{fmt(n.count||0)} users</td>
                        <td style={{ color:'var(--rs-text-muted)', fontSize:'.78rem' }}>{n.sentAt?new Date(n.sentAt.seconds*1000).toLocaleDateString('pt-AO'):'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>)}

          {/* ══ ANALYTICS ══ */}
          {section==='analytics' && (() => {
            const allDramaList = dramas.length>0?dramas:MOCK_DRAMAS.map(d=>({...d,_id:d.id})) as (Drama&{_id:string})[]
            const totalEps = allDramaList.reduce((s,d)=>s+(d.episodes?.length||0),0)
            const totalViews = allDramaList.reduce((s,d)=>s+(d.views||0),0)
            const byPlan = users.reduce((acc,u)=>{ acc[u.plan]=(acc[u.plan]||0)+1; return acc },{} as Record<string,number>)
            const topSeries = [...allDramaList].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,5)
            const avgRating = ratings.length>0?(ratings.reduce((s,r)=>s+r.rating,0)/ratings.length).toFixed(1):'—'
            const revenue = orders.filter(o=>o.status==='Aprovado').reduce((s,o)=>s+parseFloat((o.amount||'0').replace(/\D/g,'')),0)
            const planColors: Record<string,string> = { Gratuito:'#8892A4', Starter:'#22c55e', Premium:'var(--rs-primary)', VIP:'var(--rs-accent)' }
            return (<>
              {/* Summary KPIs */}
              <div className="kpis" style={{ marginBottom:'1.5rem' }}>
                <div className="kpi k1"><div className="kpi-lbl">Total de vistas</div><div className="kpi-val">{totalViews>=1000?`${(totalViews/1000).toFixed(1)}K`:fmt(totalViews)}</div><div className="kpi-d up"><TrendingUp size={12}/>{allDramaList.length} séries</div><div className="kpi-ic"><Eye size={18}/></div></div>
                <div className="kpi k2"><div className="kpi-lbl">Total episódios</div><div className="kpi-val">{fmt(totalEps)}</div><div className="kpi-d up"><TrendingUp size={12}/>{allDramaList.filter(d=>d.status==='Ativo').length} activas</div><div className="kpi-ic"><PlayCircle size={18}/></div></div>
                <div className="kpi k3"><div className="kpi-lbl">Avaliação média</div><div className="kpi-val">{avgRating} ★</div><div className="kpi-d up"><TrendingUp size={12}/>{ratings.length} avaliações</div><div className="kpi-ic"><Star size={18}/></div></div>
                <div className="kpi k4"><div className="kpi-lbl">Receita total</div><div className="kpi-val">{revenue>0?`Kz ${fmt(revenue)}`:'Kz 0'}</div><div className="kpi-d up"><TrendingUp size={12}/>{orders.length} encomendas</div><div className="kpi-ic"><Wallet size={18}/></div></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem', marginBottom:'1.5rem' }}>
                {/* Top series */}
                <div className="card" style={{ gridColumn:'1/3' }}>
                  <div className="t-head"><div className="t-t">Top séries por vistas</div></div>
                  {topSeries.map((d,i)=>{
                    const pct = totalViews>0?Math.round((d.views||0)/totalViews*100):0
                    return (
                      <div key={d.id||i} style={{ marginBottom:'.8rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.3rem' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
                            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--rs-primary)', display:'inline-block' }}/>
                            <span style={{ fontSize:'.84rem', fontWeight:600 }}>{d.title}</span>
                            <span style={{ fontSize:'.72rem', color:'var(--rs-text-muted)' }}>{GENRE_LABELS[d.genre]}</span>
                          </div>
                          <div style={{ display:'flex', gap:'1rem' }}>
                            <span className="gold" style={{ fontSize:'.82rem' }}>{fmt(d.views||0)}</span>
                            <span style={{ fontSize:'.78rem', color:'var(--rs-text-muted)', width:32, textAlign:'right' }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ height:6, background:'var(--rs-border-soft)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:'var(--rs-grad-hero)', borderRadius:3 }}/>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Plan breakdown */}
                <div className="card">
                  <div className="t-head"><div className="t-t">Utilizadores por plano</div></div>
                  {['Gratuito','Starter','Premium','VIP'].map(plan=>{
                    const cnt = byPlan[plan]||0; const pct = users.length>0?Math.round(cnt/users.length*100):0
                    return (
                      <div key={plan} style={{ marginBottom:'.8rem' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'.3rem', fontSize:'.83rem' }}>
                          <span style={{ display:'flex', alignItems:'center', gap:'.4rem' }}><span style={{ width:10, height:10, borderRadius:3, background:planColors[plan]||'#8892A4', display:'inline-block' }}/>{plan}</span>
                          <span style={{ color:'var(--rs-text-muted)' }}>{cnt} ({pct}%)</span>
                        </div>
                        <div style={{ height:5, background:'var(--rs-border-soft)', borderRadius:3 }}><div style={{ height:'100%', width:`${pct}%`, background:planColors[plan]||'#8892A4', borderRadius:3 }}/></div>
                      </div>
                    )
                  })}
                  <div style={{ marginTop:'1rem', padding:'.75rem', background:'var(--rs-bg-cool-3)', borderRadius:10, textAlign:'center' }}>
                    <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.6rem', color:'var(--rs-accent)' }}>{users.length}</div>
                    <div style={{ fontSize:'.72rem', color:'var(--rs-text-muted)' }}>utilizadores totais</div>
                  </div>
                </div>
              </div>
              {/* Encomendas por pacote */}
              <div className="card">
                <div className="t-head"><div className="t-t">Encomendas por pacote</div></div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem' }}>
                  {['Básico','Popular','Mega','Ultra VIP'].map(pkg=>{
                    const pkgOrders = orders.filter(o=>o.package===pkg)
                    const approved = pkgOrders.filter(o=>o.status==='Aprovado')
                    const rev = approved.reduce((s,o)=>s+parseFloat((o.amount||'0').replace(/\D/g,'')),0)
                    return (
                      <div key={pkg} style={{ padding:'1rem', background:'var(--rs-bg-cool-3)', borderRadius:12, textAlign:'center' }}>
                        <div style={{ fontSize:'.72rem', color:'var(--rs-text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:'.5rem' }}>{pkg}</div>
                        <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.6rem', lineHeight:1, marginBottom:'.2rem' }}>{pkgOrders.length}</div>
                        <div style={{ fontSize:'.72rem', color:'var(--rs-text-muted)', marginBottom:'.5rem' }}>encomendas</div>
                        <div style={{ fontSize:'.84rem', color:'var(--rs-accent)', fontWeight:700 }}>Kz {fmt(rev)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>)
          })()}

          {/* ══ BANNERS ══ */}
          {section==='banners' && (() => {
            const allDramaList = dramas.length>0?dramas:MOCK_DRAMAS.map(d=>({...d,_id:d.id})) as (Drama&{_id:string})[]
            const tabs: {id:BannerPage;label:string;url:string}[] = [
              {id:'landing',  label:'Página Inicial',   url:'reelstory-next.vercel.app/'},
              {id:'login',    label:'Página de Login',  url:'reelstory-next.vercel.app/login'},
              {id:'inicio',   label:'Início (Hero)',    url:'reelstory-next.vercel.app/inicio'},
              {id:'explorar', label:'Explorar (Destaque)',url:'reelstory-next.vercel.app/explorar'},
            ]
            return (<>
              {/* Page tabs */}
              <div style={{ display:'flex', gap:6, marginBottom:'1.5rem', background:'var(--rs-bg-cool-3)', borderRadius:12, padding:4 }}>
                {tabs.map(t=>(
                  <button key={t.id} onClick={()=>setBannerTab(t.id)}
                    style={{ flex:1, padding:'.65rem .5rem', borderRadius:9, border:'none', cursor:'pointer', transition:'all .18s', textAlign:'center',
                      background: bannerTab===t.id ? 'var(--rs-bg-cool)' : 'transparent',
                      color: bannerTab===t.id ? '#fff' : 'var(--rs-text-muted)',
                      boxShadow: bannerTab===t.id ? '0 0 0 1px var(--rs-border-base)' : 'none',
                    }}>
                    <div style={{ fontSize:'.82rem', fontWeight:700 }}>{t.label}</div>
                    <div style={{ fontSize:'.68rem', color:'var(--rs-text-muted)', marginTop:2 }}>{t.url}</div>
                  </button>
                ))}
              </div>

              {/* â"€â"€ Landing banner â"€â"€ */}
              {bannerTab==='landing' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
                  <div className="card">
                    <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1rem', marginBottom:'1.2rem' }}>Banner — Página Inicial</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:'1rem' }}>
                      <div><label className="field-lbl">Título principal</label><input className="field-in" value={bLanding.title} onChange={e=>setBLanding(p=>({...p,title:e.target.value}))} placeholder="Ex: Dramas asiáticos na ponta dos dedos"/></div>
                      <div><label className="field-lbl">Subtítulo / Descrição</label><textarea className="field-in" value={bLanding.subtitle} onChange={e=>setBLanding(p=>({...p,subtitle:e.target.value}))} rows={2} style={{ resize:'vertical' }}/></div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        <div><label className="field-lbl">Badge / Pill (ex: NOVO)</label><input className="field-in" value={bLanding.badge} onChange={e=>setBLanding(p=>({...p,badge:e.target.value}))}/></div>
                        <div><label className="field-lbl">Texto do botão CTA</label><input className="field-in" value={bLanding.ctaText} onChange={e=>setBLanding(p=>({...p,ctaText:e.target.value}))}/></div>
                      </div>
                      <div>
                        <label className="field-lbl">Gradiente de fundo (CSS)</label>
                        <input className="field-in" value={bLanding.gradient} onChange={e=>setBLanding(p=>({...p,gradient:e.target.value}))} placeholder="linear-gradient(...)"/>
                        <div style={{ marginTop:6, height:40, borderRadius:8, background:bLanding.heroImage?`url(${bLanding.heroImage}) center/cover`:bLanding.gradient, border:'1px solid var(--rs-border-base)' }}/>
                      </div>
                      <div>
                        <label className="field-lbl">Imagem do ecrã do telemóvel</label>
                        <div style={{ fontSize:'.72rem', color:'var(--rs-text-muted)', marginBottom:6 }}>Esta imagem aparece dentro do mockup do telemóvel. Proporção ideal: 9:19 (vertical).</div>
                        <ImageUpload
                          images={bLanding.heroImage ? [bLanding.heroImage] : []}
                          onAdd={url=>setBLanding(p=>({...p,heroImage:url}))}
                          onRemove={()=>setBLanding(p=>({...p,heroImage:undefined}))}
                          folder="banners" browseFolder="banners" single label="Upload imagem para o telemóvel"
                        />
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        <div><label className="field-lbl">Título dentro do telemóvel</label><input className="field-in" value={bLanding.phoneTitle||''} onChange={e=>setBLanding(p=>({...p,phoneTitle:e.target.value}))} placeholder="Ex: Amor em Segredo"/></div>
                        <div><label className="field-lbl">Texto do episódio</label><input className="field-in" value={bLanding.phoneEp||''} onChange={e=>setBLanding(p=>({...p,phoneEp:e.target.value}))} placeholder="Ex: Ep. 8 · ★ 4.9"/></div>
                      </div>
                      <div style={{ display:'none' }}>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'.65rem .85rem', background:'var(--rs-bg-cool-3)', borderRadius:10, border:'1px solid var(--rs-border-soft)' }}>
                        <span style={{ fontSize:'.84rem', fontWeight:600 }}>Banner activo</span>
                        <label style={{ display:'flex', alignItems:'center', gap:'.5rem', cursor:'pointer' }}>
                          <input type="checkbox" checked={bLanding.active} onChange={e=>setBLanding(p=>({...p,active:e.target.checked}))} style={{ accentColor:'var(--rs-primary)', width:16, height:16 }}/>
                          <span style={{ fontSize:'.78rem', color:bLanding.active?'#22c55e':'var(--rs-text-muted)' }}>{bLanding.active?'Activo':'Inactivo'}</span>
                        </label>
                      </div>
                    </div>
                    <button onClick={()=>saveBanner('landing',bLanding)} disabled={bannerSaving} className="btn-primary" style={{ width:'100%', justifyContent:'center', opacity:bannerSaving?.6:1 }}>
                      <Save size={14}/>{bannerSaving?'A guardar...':'Guardar banner'}
                    </button>
                  </div>
                  {/* Preview — phone mockup */}
                  <div>
                    <div style={{ fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--rs-text-muted)', marginBottom:12 }}>Pré-visualização — ecrã do telemóvel</div>
                    <div style={{ display:'flex', justifyContent:'center' }}>
                      <div style={{ width:160, aspectRatio:'9/19', borderRadius:26, border:'6px solid #2a2a35', background:'#000', overflow:'hidden', position:'relative', boxShadow:'0 20px 50px rgba(0,0,0,.6)' }}>
                        <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:50, height:14, background:'#000', borderRadius:'0 0 8px 8px', zIndex:5 }}/>
                        <div style={{
                          width:'100%', height:'100%', position:'relative',
                          background: bLanding.heroImage ? `url(${bLanding.heroImage}) center/cover` : 'linear-gradient(135deg,#FF385C,#D50032)',
                          display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'1rem .7rem',
                        }}>
                          {bLanding.heroImage && <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.75) 0%,rgba(0,0,0,.1) 50%,transparent 100%)' }}/>}
                          <div style={{ display:'flex', justifyContent:'space-between', position:'relative', zIndex:1 }}>
                            <span style={{ fontSize:'.4rem', fontWeight:800, background:'rgba(255,56,92,.85)', padding:'.1rem .35rem', borderRadius:50 }}>EP. 8 / 24</span>
                            <span style={{ background:'rgba(0,0,0,.4)', padding:'.1rem .3rem', borderRadius:3, fontSize:'.4rem', fontWeight:700 }}>HD</span>
                          </div>
                          <div style={{ position:'relative', zIndex:1 }}>
                            <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'.65rem', marginBottom:2, textShadow:'0 1px 3px rgba(0,0,0,.6)' }}>{bLanding.phoneTitle||'Título'}</div>
                            <div style={{ fontSize:'.42rem', color:'rgba(255,255,255,.85)' }}>{bLanding.phoneEp||'Ep. 8 · ★ 4.9'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {!bLanding.heroImage && <div style={{ textAlign:'center', fontSize:'.72rem', color:'var(--rs-text-muted)', marginTop:8 }}>Faz upload de uma imagem para ver a pré-visualização</div>}
                  </div>
                </div>
              )}

              {/* â"€â"€ Login banner â"€â"€ */}
              {bannerTab==='login' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
                  <div className="card">
                    <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1rem', marginBottom:'1.2rem' }}>Banner — Página de Login</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:'1rem' }}>
                      <div><label className="field-lbl">Tagline (abaixo do logo)</label><input className="field-in" value={bLogin.tagline} onChange={e=>setBLogin(p=>({...p,tagline:e.target.value}))}/></div>
                      <div style={{ fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.6px', color:'var(--rs-text-muted)', margin:'4px 0 2px' }}>Estatísticas (3 pills)</div>
                      {[
                        {nk:'s1n',lk:'s1l',np:bLogin.s1n,lp:bLogin.s1l},
                        {nk:'s2n',lk:'s2l',np:bLogin.s2n,lp:bLogin.s2l},
                        {nk:'s3n',lk:'s3l',np:bLogin.s3n,lp:bLogin.s3l},
                      ].map((s,i)=>(
                        <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                          <div><label className="field-lbl">NÂº {i+1}</label><input className="field-in" value={s.np} onChange={e=>setBLogin(p=>({...p,[s.nk]:e.target.value}))} placeholder="Ex: 500+"/></div>
                          <div><label className="field-lbl">Label {i+1}</label><input className="field-in" value={s.lp} onChange={e=>setBLogin(p=>({...p,[s.lk]:e.target.value}))} placeholder="Ex: Dramas"/></div>
                        </div>
                      ))}
                      <div>
                        <label className="field-lbl">Imagens do painel lateral animado</label>
                        <div style={{ fontSize:'.72rem', color:'var(--rs-text-muted)', marginBottom:6, lineHeight:1.4 }}>
                          Adiciona imagens que aparecem nas 3 colunas animadas da página de login. Mínimo recomendado: 9 imagens (3 por coluna). Proporção ideal: 2:3 (poster).
                        </div>
                        <ImageUpload
                          images={bLogin.images||[]}
                          onAdd={url=>setBLogin(p=>({...p,images:[...(p.images||[]),url]}))}
                          onRemove={url=>setBLogin(p=>({...p,images:(p.images||[]).filter(u=>u!==url)}))}
                          folder="banners" browseFolder="banners" label="Upload poster para o painel"
                          maxImages={30}
                        />
                      </div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'.65rem .85rem', background:'var(--rs-bg-cool-3)', borderRadius:10, border:'1px solid var(--rs-border-soft)' }}>
                        <span style={{ fontSize:'.84rem', fontWeight:600 }}>Banner activo</span>
                        <label style={{ display:'flex', alignItems:'center', gap:'.5rem', cursor:'pointer' }}>
                          <input type="checkbox" checked={bLogin.active} onChange={e=>setBLogin(p=>({...p,active:e.target.checked}))} style={{ accentColor:'var(--rs-primary)', width:16, height:16 }}/>
                          <span style={{ fontSize:'.78rem', color:bLogin.active?'#22c55e':'var(--rs-text-muted)' }}>{bLogin.active?'Activo':'Inactivo'}</span>
                        </label>
                      </div>
                    </div>
                    <button onClick={()=>saveBanner('login',bLogin)} disabled={bannerSaving} className="btn-primary" style={{ width:'100%', justifyContent:'center', opacity:bannerSaving?.6:1 }}>
                      <Save size={14}/>{bannerSaving?'A guardar...':'Guardar banner'}
                    </button>
                  </div>
                  {/* Preview */}
                  <div>
                    <div style={{ fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--rs-text-muted)', marginBottom:8 }}>Pré-visualização</div>
                    <div style={{ borderRadius:14, background:'var(--rs-bg-cool-3)', border:'1px solid var(--rs-border-base)', padding:'1.5rem', textAlign:'center' }}>
                      <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.8rem', marginBottom:'.4rem' }}>Reel<span style={{ color:'var(--rs-primary)' }}>Story</span></div>
                      <div style={{ fontSize:'.84rem', color:'var(--rs-text-muted)', marginBottom:'1.2rem' }}>{bLogin.tagline||'Tagline...'}</div>
                      <div style={{ display:'flex', justifyContent:'center', gap:'1.5rem', flexWrap:'wrap' }}>
                        {[[bLogin.s1n,bLogin.s1l],[bLogin.s2n,bLogin.s2l],[bLogin.s3n,bLogin.s3l]].map(([n,l],i)=>(
                          <div key={i} style={{ textAlign:'center' }}>
                            <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.2rem', color:'var(--rs-primary)' }}>{n||'—'}</div>
                            <div style={{ fontSize:'.68rem', color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.5px' }}>{l||'—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* â"€â"€ Início banner â"€â"€ */}
              {bannerTab==='inicio' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
                  <div className="card">
                    <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1rem', marginBottom:'1.2rem' }}>Banner — Início (Série em Destaque)</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:'1rem' }}>
                      <div>
                        <label className="field-lbl">Série em destaque no Hero</label>
                        <select className="field-in" value={bInicio.dramaId} onChange={e=>setBInicio(p=>({...p,dramaId:e.target.value}))}>
                          {allDramaList.map(d=>(
                            <option key={d._id||d.id} value={d._id||d.id}>{d.title} ({GENRE_LABELS[d.genre]})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="field-lbl">Imagem de fundo do Hero (opcional)</label>
                        <ImageUpload
                          images={bInicio.heroImage ? [bInicio.heroImage] : []}
                          onAdd={url=>setBInicio(p=>({...p,heroImage:url}))}
                          onRemove={()=>setBInicio(p=>({...p,heroImage:undefined}))}
                          folder="banners" browseFolder="banners" single label="Upload imagem hero"
                        />
                      </div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'.65rem .85rem', background:'var(--rs-bg-cool-3)', borderRadius:10, border:'1px solid var(--rs-border-soft)' }}>
                        <span style={{ fontSize:'.84rem', fontWeight:600 }}>Hero dinâmico activo</span>
                        <label style={{ display:'flex', alignItems:'center', gap:'.5rem', cursor:'pointer' }}>
                          <input type="checkbox" checked={bInicio.active} onChange={e=>setBInicio(p=>({...p,active:e.target.checked}))} style={{ accentColor:'var(--rs-primary)', width:16, height:16 }}/>
                          <span style={{ fontSize:'.78rem', color:bInicio.active?'#22c55e':'var(--rs-text-muted)' }}>{bInicio.active?'Activo':'Inactivo'}</span>
                        </label>
                      </div>
                    </div>
                    <button onClick={()=>saveBanner('inicio',bInicio)} disabled={bannerSaving} className="btn-primary" style={{ width:'100%', justifyContent:'center', opacity:bannerSaving?.6:1 }}>
                      <Save size={14}/>{bannerSaving?'A guardar...':'Guardar banner'}
                    </button>
                  </div>
                  {/* Preview */}
                  <div>
                    <div style={{ fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--rs-text-muted)', marginBottom:8 }}>Série seleccionada</div>
                    {(() => {
                      const d = allDramaList.find(x=>(x._id||x.id)===bInicio.dramaId)||allDramaList[0]
                      if (!d) return null
                      return (
                        <div style={{ borderRadius:14, background:d.posterGrad||'var(--rs-poster-romance)', border:'1px solid var(--rs-border-base)', padding:'1.5rem', display:'flex', flexDirection:'column', justifyContent:'flex-end', minHeight:200, position:'relative', overflow:'hidden' }}>
                          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 60%)' }}/>
                          <div style={{ position:'relative', zIndex:1 }}>
                            <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.3rem', marginBottom:'.3rem' }}>{d.title}</div>
                            <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.7)', display:'flex', gap:'.5rem' }}>
                              <span>★ {d.rating}</span><span>·</span><span>{d.episodes?.length||0} eps</span><span>·</span><span>{GENRE_LABELS[d.genre]}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* â"€â"€ Explorar banner â"€â"€ */}
              {bannerTab==='explorar' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
                  <div className="card">
                    <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1rem', marginBottom:'1.2rem' }}>Banner — Explorar (EM DESTAQUE)</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:'1rem' }}>
                      <div>
                        <label className="field-lbl">Série em destaque</label>
                        <select className="field-in" value={bExplorar.dramaId} onChange={e=>setBExplorar(p=>({...p,dramaId:e.target.value}))}>
                          {allDramaList.map(d=>(
                            <option key={d._id||d.id} value={d._id||d.id}>{d.title} ({GENRE_LABELS[d.genre]})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="field-lbl">Texto do badge</label>
                        <input className="field-in" value={bExplorar.badgeText} onChange={e=>setBExplorar(p=>({...p,badgeText:e.target.value}))} placeholder="EM DESTAQUE"/>
                      </div>
                      <div>
                        <label className="field-lbl">Imagem do banner (opcional)</label>
                        <ImageUpload
                          images={bExplorar.bannerImage ? [bExplorar.bannerImage] : []}
                          onAdd={url=>setBExplorar(p=>({...p,bannerImage:url}))}
                          onRemove={()=>setBExplorar(p=>({...p,bannerImage:undefined}))}
                          folder="banners" browseFolder="banners" single label="Upload imagem do banner"
                        />
                      </div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'.65rem .85rem', background:'var(--rs-bg-cool-3)', borderRadius:10, border:'1px solid var(--rs-border-soft)' }}>
                        <span style={{ fontSize:'.84rem', fontWeight:600 }}>Banner activo</span>
                        <label style={{ display:'flex', alignItems:'center', gap:'.5rem', cursor:'pointer' }}>
                          <input type="checkbox" checked={bExplorar.active} onChange={e=>setBExplorar(p=>({...p,active:e.target.checked}))} style={{ accentColor:'var(--rs-primary)', width:16, height:16 }}/>
                          <span style={{ fontSize:'.78rem', color:bExplorar.active?'#22c55e':'var(--rs-text-muted)' }}>{bExplorar.active?'Activo':'Inactivo'}</span>
                        </label>
                      </div>
                    </div>
                    <button onClick={()=>saveBanner('explorar',bExplorar)} disabled={bannerSaving} className="btn-primary" style={{ width:'100%', justifyContent:'center', opacity:bannerSaving?.6:1 }}>
                      <Save size={14}/>{bannerSaving?'A guardar...':'Guardar banner'}
                    </button>
                  </div>
                  {/* Preview */}
                  <div>
                    <div style={{ fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--rs-text-muted)', marginBottom:8 }}>Pré-visualização do banner</div>
                    {(() => {
                      const d = allDramaList.find(x=>(x._id||x.id)===bExplorar.dramaId)||allDramaList[0]
                      if (!d) return null
                      return (
                        <div style={{ borderRadius:14, height:180, background:d.posterGrad||'var(--rs-poster-romance)', border:'1px solid var(--rs-border-base)', position:'relative', overflow:'hidden', display:'flex', alignItems:'flex-end' }}>
                          <div style={{ position:'absolute', right:'5%', top:'50%', transform:'translateY(-50%)', fontSize:'4rem', opacity:.3 }} dangerouslySetInnerHTML={{ __html:(d as any).icon||'🎬' }}/>
                          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to right,rgba(0,0,0,.85) 0%,rgba(0,0,0,.1) 70%)' }}/>
                          <div style={{ position:'relative', zIndex:1, padding:'1rem' }}>
                            <div style={{ display:'inline-block', background:'rgba(255,56,92,.25)', border:'1px solid rgba(255,56,92,.5)', borderRadius:50, padding:'.15rem .6rem', fontSize:'.65rem', fontWeight:700, color:'var(--rs-primary)', marginBottom:'.5rem' }}>{bExplorar.badgeText||'EM DESTAQUE'}</div>
                            <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.2rem', lineHeight:1.2, marginBottom:'.3rem' }}>{d.title}</div>
                            <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,.7)' }}>★ {d.rating} · {d.episodes?.length||0} eps</div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </>)
          })()}

        </div>
      </div>
    </div>

    {/* ══ EPISODE MODAL ══ */}
    {epDrama && (
      <div className="modal-bg" onClick={()=>setEpDrama(null)}>
        <div className="modal-box" onClick={e=>e.stopPropagation()}>
          <div className="modal-hd">
            <div><div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1rem' }}>Episódios</div><div style={{ fontSize:'.78rem', color:'var(--rs-text-muted)', marginTop:2 }}>{epDrama.title} · {epList.length} eps</div></div>
            <button onClick={()=>setEpDrama(null)} style={{ background:'none', border:'none', color:'var(--rs-text-muted)', cursor:'pointer', display:'flex' }}><X size={18}/></button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'1rem 1.4rem' }}>
            {epList.length===0 && <div style={{ color:'var(--rs-text-muted)', textAlign:'center', padding:'2rem', fontSize:'.84rem' }}>Sem episódios. Adiciona o primeiro abaixo.</div>}
            {epList.map((ep,i)=>(
              <div key={ep.id||i} style={{ display:'flex', alignItems:'center', gap:'.75rem', padding:'.65rem .75rem', borderRadius:10, background:'rgba(255,255,255,.03)', border:'1px solid var(--rs-border-soft)', marginBottom:6 }}>
                <div style={{ width:28, height:28, borderRadius:6, background:'var(--rs-grad-hero)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.78rem', fontWeight:700, flexShrink:0 }}>{ep.order}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'.85rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ep.title}</div>
                  <div style={{ fontSize:'.72rem', color:'var(--rs-text-muted)', display:'flex', gap:'.5rem', marginTop:2 }}>
                    <span style={{ fontFamily:'monospace', fontSize:'.7rem' }}>{ep.url ? ep.url.split('/').slice(-2).join('/') : (ep.ytId||'—')}</span>
                    {ep.free && <span style={{ color:'#22c55e', fontWeight:700 }}>GRÁTIS</span>}
                  </div>
                </div>
                {(ep.url||ep.ytId) && <a href={ep.url||`https://youtu.be/${ep.ytId}`} target="_blank" rel="noopener" style={{ color:'var(--rs-text-muted)', display:'flex' }}><PlayCircle size={16}/></a>}
                <button onClick={()=>handleDeleteEp(i)} className="act-btn" style={{ background:'rgba(239,68,68,.12)', color:'#ef4444', flexShrink:0 }}><Trash2 size={12}/></button>
              </div>
            ))}
          </div>
          <div style={{ padding:'1rem 1.4rem', borderTop:'1px solid var(--rs-border-soft)', background:'rgba(255,255,255,.02)' }}>
            <div style={{ fontSize:'.72rem', color:'var(--rs-text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:'.6rem' }}>Adicionar episódio</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
              <div><label className="field-lbl">Título</label><input className="field-in" value={epForm.title} onChange={e=>setEpForm(p=>({...p,title:e.target.value}))} placeholder="Ex: O Encontro"/></div>
              <div><label className="field-lbl">URL Cloudinary</label><input className="field-in" value={epForm.url} onChange={e=>setEpForm(p=>({...p,url:e.target.value}))} placeholder="https://res.cloudinary.com/..."/></div>
              <div><label className="field-lbl">NÂº Episódio</label><input className="field-in" type="number" min={1} value={epForm.order} onChange={e=>setEpForm(p=>({...p,order:parseInt(e.target.value)||1}))}/></div>
              <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                <label style={{ display:'flex', alignItems:'center', gap:'.5rem', cursor:'pointer', padding:'.55rem .85rem', background:'rgba(255,255,255,.04)', borderRadius:8, border:'1px solid var(--rs-border-base)' }}>
                  <input type="checkbox" checked={epForm.free} onChange={e=>setEpForm(p=>({...p,free:e.target.checked}))} style={{ accentColor:'var(--rs-primary)', width:15, height:15 }}/>
                  <span style={{ fontSize:'.84rem', color:epForm.free?'#22c55e':'var(--rs-text-muted)', fontWeight:600 }}>Grátis</span>
                </label>
              </div>
            </div>
            <button onClick={handleSaveEp} disabled={epSaving||!epForm.title.trim()||!epForm.url.trim()} className="btn-primary" style={{ opacity:(epSaving||!epForm.title.trim()||!epForm.url.trim())?.5:1 }}>
              <Plus size={14}/>{epSaving?'A guardar...':'Adicionar episódio'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ══ COIN MODAL ══ */}
    {coinUser && (
      <div className="modal-bg" onClick={()=>setCoinUser(null)}>
        <div className="modal-box" style={{ maxWidth:400 }} onClick={e=>e.stopPropagation()}>

          {/* Header */}
          <div className="modal-hd">
            <div>
              <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.15rem', letterSpacing:'-.01em' }}>Gerir Pontos</div>
              <div style={{ fontSize:'.75rem', color:'var(--rs-text-muted)', marginTop:2, letterSpacing:'.2px' }}>
                {coinMode==='dar' ? 'Adicionar pontos à conta' : 'Remover pontos da conta'}
              </div>
            </div>
            <button onClick={()=>setCoinUser(null)} style={{ background:'none', border:'none', color:'var(--rs-text-muted)', cursor:'pointer', display:'flex', padding:4 }}><X size={18}/></button>
          </div>

          <div style={{ padding:'1.1rem 1.4rem', display:'flex', flexDirection:'column', gap:'1rem' }}>

            {/* User info */}
            <div style={{ display:'flex', alignItems:'center', gap:'.85rem', padding:'.85rem 1rem', background:'rgba(255,255,255,.04)', borderRadius:14, border:'1px solid var(--rs-border-soft)' }}>
              <div style={{ width:42, height:42, borderRadius:12, background:'var(--rs-grad-hero)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.1rem', flexShrink:0 }}>
                {(coinUser.name||'U')[0].toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:'.95rem', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{coinUser.name}</div>
                <div style={{ fontSize:'.75rem', color:'var(--rs-text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{coinUser.email}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.5rem', color:'var(--rs-accent)', lineHeight:1 }}>{fmt(coinUser.coins||0)}</div>
                <div style={{ fontSize:'.68rem', color:'var(--rs-text-muted)', marginTop:2, textTransform:'uppercase', letterSpacing:'.4px' }}>pontos actuais</div>
              </div>
            </div>

            {/* Mode toggle */}
            <div>
              <div style={{ fontSize:'.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--rs-text-muted)', marginBottom:6 }}>Operação</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, background:'var(--rs-bg-cool-3)', borderRadius:12, padding:4 }}>
                <button onClick={()=>{setCoinMode('dar');setCoinAmt('')}}
                  style={{ padding:'.65rem .5rem', borderRadius:9, border:'none', cursor:'pointer', transition:'all .18s', display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                    background: coinMode==='dar' ? 'rgba(34,197,94,.18)' : 'transparent',
                    color: coinMode==='dar' ? '#22c55e' : 'var(--rs-text-muted)',
                    boxShadow: coinMode==='dar' ? '0 0 0 1px rgba(34,197,94,.35)' : 'none',
                  }}>
                  <span style={{ fontSize:'1.1rem', lineHeight:1 }}>ï¼‹</span>
                  <span style={{ fontSize:'.8rem', fontWeight:700, letterSpacing:'.2px' }}>Dar pontos</span>
                </button>
                <button onClick={()=>{setCoinMode('retirar');setCoinAmt('')}}
                  style={{ padding:'.65rem .5rem', borderRadius:9, border:'none', cursor:'pointer', transition:'all .18s', display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                    background: coinMode==='retirar' ? 'rgba(239,68,68,.15)' : 'transparent',
                    color: coinMode==='retirar' ? '#ef4444' : 'var(--rs-text-muted)',
                    boxShadow: coinMode==='retirar' ? '0 0 0 1px rgba(239,68,68,.3)' : 'none',
                  }}>
                  <span style={{ fontSize:'1.1rem', lineHeight:1 }}>ï¼</span>
                  <span style={{ fontSize:'.8rem', fontWeight:700, letterSpacing:'.2px' }}>Retirar pontos</span>
                </button>
              </div>
            </div>

            {/* Quick amounts */}
            <div>
              <div style={{ fontSize:'.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--rs-text-muted)', marginBottom:6 }}>Valor rápido</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {[50,100,200,500,1000,2000].map(v => {
                  const active = coinAmt === String(v)
                  const activeColor = coinMode==='dar' ? '#22c55e' : '#ef4444'
                  const activeBg = coinMode==='dar' ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.1)'
                  const activeBorder = coinMode==='dar' ? 'rgba(34,197,94,.45)' : 'rgba(239,68,68,.45)'
                  return (
                    <button key={v} onClick={()=>setCoinAmt(String(v))} style={{
                      padding:'.38rem .8rem', borderRadius:8,
                      border:`1px solid ${active ? activeBorder : 'var(--rs-border-base)'}`,
                      background: active ? activeBg : 'var(--rs-bg-cool-3)',
                      color: active ? activeColor : 'var(--rs-text-muted)',
                      fontSize:'.82rem', fontWeight:700, cursor:'pointer', transition:'all .15s',
                      letterSpacing:'.2px',
                    }}>
                      <span style={{ opacity:.7, marginRight:1 }}>{coinMode==='dar'?'+':'-'}</span>{fmt(v)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom amount */}
            <div>
              <div style={{ fontSize:'.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--rs-text-muted)', marginBottom:6 }}>Ou digita o valor</div>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:'.9rem', top:'50%', transform:'translateY(-50%)', fontWeight:900, fontSize:'1.15rem', lineHeight:1, color: coinMode==='dar'?'#22c55e':'#ef4444', pointerEvents:'none' }}>
                  {coinMode==='dar'?'+':'-'}
                </span>
                <input className="field-in" type="number" min={1} value={coinAmt} onChange={e=>setCoinAmt(e.target.value)} placeholder="0" autoFocus
                  style={{ paddingLeft:'2.1rem', fontSize:'1.15rem', fontFamily:'var(--rs-font-display)', fontWeight:700, letterSpacing:'-.01em',
                    borderColor: coinAmt && parseInt(coinAmt)>0 ? (coinMode==='dar'?'rgba(34,197,94,.4)':'rgba(239,68,68,.4)') : 'var(--rs-border-base)',
                    color: coinAmt && parseInt(coinAmt)>0 ? (coinMode==='dar'?'#22c55e':'#ef4444') : 'var(--rs-text)',
                  }}/>
              </div>
              {coinAmt && parseInt(coinAmt) > 0 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'.5rem', padding:'.5rem .75rem', background:'rgba(255,255,255,.03)', borderRadius:8, border:'1px solid var(--rs-border-soft)' }}>
                  <span style={{ fontSize:'.78rem', color:'var(--rs-text-muted)', letterSpacing:'.1px' }}>Novo saldo</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
                    <strong style={{ fontSize:'.92rem', fontFamily:'var(--rs-font-display)', fontWeight:900, color: coinMode==='dar'?'#22c55e':'#ef4444', letterSpacing:'-.01em' }}>
                      {fmt(Math.max(0, (coinUser.coins||0) + (coinMode==='dar'?1:-1)*parseInt(coinAmt)))} pts
                    </strong>
                    {coinMode==='retirar' && parseInt(coinAmt) > (coinUser.coins||0) && (
                      <span style={{ fontSize:'.72rem', fontWeight:700, color:'#f59e0b', background:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.3)', borderRadius:50, padding:'.1rem .5rem' }}>âš  insuficiente</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:8, paddingTop:'.1rem' }}>
              <button onClick={handleGiveCoins} disabled={coinSaving||!coinAmt.trim()||parseInt(coinAmt)<=0} className="btn-primary"
                style={{ flex:1, justifyContent:'center', fontSize:'.92rem', letterSpacing:'.1px',
                  background: coinMode==='dar' ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                  opacity:(coinSaving||!coinAmt.trim()||parseInt(coinAmt)<=0) ? .45 : 1 }}>
                {coinSaving
                  ? 'A guardar...'
                  : coinMode==='dar'
                    ? <>ï¼‹ Dar {coinAmt&&parseInt(coinAmt)>0 && <strong>{fmt(parseInt(coinAmt))}</strong>} pts</>
                    : <>ï¼ Retirar {coinAmt&&parseInt(coinAmt)>0 && <strong>{fmt(parseInt(coinAmt))}</strong>} pts</>
                }
              </button>
              <button onClick={()=>setCoinUser(null)} className="btn-ghost" style={{ letterSpacing:'.1px' }}>Cancelar</button>
            </div>

          </div>
        </div>
      </div>
    )}

    {toast && <div className="toast">{toast}</div>}

    <style>{`
      html,body{margin:0;-webkit-font-smoothing:antialiased;}
      *,*::before,*::after{box-sizing:border-box;}
      .admin-root{background:var(--rs-bg-cool-3);color:var(--rs-text);font-family:var(--rs-font-body);display:flex;min-height:100dvh;}

      /* SIDEBAR */
      .sidebar{width:240px;background:var(--rs-bg-cool);border-right:1px solid var(--rs-border-soft);display:flex;flex-direction:column;position:fixed;inset:0 auto 0 0;z-index:100;}
      .s-logo{padding:1.3rem 1.2rem;border-bottom:1px solid var(--rs-border-soft);display:flex;align-items:center;gap:.7rem;}
      .s-logo .lg{font-family:var(--rs-font-display);font-weight:900;font-size:1.2rem;}
      .s-logo .lg span{color:var(--rs-primary);}
      .s-tag{font-size:.58rem;background:rgba(255,56,92,.2);color:var(--rs-primary);padding:.15rem .5rem;border-radius:4px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;}
      .nav-label{padding:1rem 1.2rem .35rem;font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--rs-text-muted);}
      .nav-item{display:flex;align-items:center;gap:.75rem;padding:.65rem 1.2rem;color:var(--rs-text-muted);cursor:pointer;font-size:.88rem;font-weight:500;border-left:3px solid transparent;transition:all .18s;}
      .nav-item svg{width:16px;height:16px;flex-shrink:0;}
      .nav-item:hover{background:rgba(255,255,255,.03);color:#fff;}
      .nav-item.on{background:rgba(255,56,92,.10);color:#fff;border-left-color:var(--rs-primary);}
      .nav-badge{margin-left:auto;background:var(--rs-primary);color:#fff;font-size:.62rem;font-weight:700;padding:.1rem .45rem;border-radius:50px;}
      .s-foot{margin-top:auto;padding:.9rem 1.2rem;border-top:1px solid var(--rs-border-soft);display:flex;align-items:center;gap:.7rem;}
      .av{width:34px;height:34px;border-radius:50%;background:var(--rs-grad-hero);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;flex-shrink:0;}
      .nm{font-size:.85rem;font-weight:700;}
      .rl{font-size:.7rem;color:var(--rs-text-muted);}
      .out{margin-left:auto;background:none;border:none;color:var(--rs-text-muted);cursor:pointer;display:flex;}

      /* MAIN */
      .main{margin-left:240px;flex:1;display:flex;flex-direction:column;}
      .topbar{background:var(--rs-bg-cool);border-bottom:1px solid var(--rs-border-soft);padding:.85rem 1.8rem;display:flex;align-items:center;gap:1rem;position:sticky;top:0;z-index:50;}
      .pg-title{font-family:var(--rs-font-display);font-size:1.3rem;font-weight:900;flex:1;}
      .search{position:relative;}
      .search input{background:var(--rs-bg-cool-2);border:1px solid var(--rs-border-base);border-radius:50px;color:#fff;padding:.5rem 1rem .5rem 2.3rem;font-family:var(--rs-font-body);font-size:.84rem;outline:none;width:220px;}
      .search input:focus{border-color:var(--rs-primary);}
      .search svg{position:absolute;left:.85rem;top:50%;transform:translateY(-50%);opacity:.45;width:14px;height:14px;}
      .ibtn{background:var(--rs-bg-cool-2);border:1px solid var(--rs-border-base);color:var(--rs-text-muted);width:36px;height:36px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;transition:all .18s;flex-shrink:0;}
      .ibtn:hover{border-color:var(--rs-primary);color:var(--rs-primary);}
      .ibtn svg{width:15px;height:15px;}
      .dot{position:absolute;top:6px;right:6px;width:8px;height:8px;background:var(--rs-primary);border-radius:50%;border:2px solid var(--rs-bg-cool);}

      .content{padding:1.8rem;}

      /* KPIS */
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem;}
      .kpi{background:var(--rs-bg-cool-2);border-radius:16px;padding:1.2rem;border:1px solid var(--rs-border-soft);position:relative;overflow:hidden;}
      .kpi::after{content:"";position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;opacity:.07;}
      .kpi.k1::after{background:var(--rs-primary);}
      .kpi.k2::after{background:#22c55e;}
      .kpi.k3::after{background:var(--rs-accent);}
      .kpi.k4::after{background:#3b82f6;}
      .kpi-lbl{font-size:.72rem;color:var(--rs-text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:.5rem;}
      .kpi-val{font-family:var(--rs-font-display);font-size:1.9rem;font-weight:900;line-height:1;}
      .kpi-d{font-size:.76rem;display:flex;align-items:center;gap:.3rem;margin-top:.4rem;}
      .kpi-d.up{color:#22c55e;} .kpi-d.dn{color:#ef4444;}
      .kpi-ic{position:absolute;top:1rem;right:1rem;opacity:.65;color:#fff;}

      /* CHARTS */
      .charts{display:grid;grid-template-columns:2fr 1fr;gap:1rem;margin-bottom:1.5rem;}
      .card{background:var(--rs-bg-cool-2);border-radius:16px;padding:1.3rem;border:1px solid var(--rs-border-soft);}
      .ch-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.2rem;}
      .ch-t{font-weight:700;font-size:.92rem;}
      .ch-s{font-size:.72rem;color:var(--rs-text-muted);margin-top:.2rem;}
      .ch-sel{background:var(--rs-bg-cool-3);border:1px solid var(--rs-border-base);color:#fff;padding:.3rem .6rem;border-radius:8px;font-size:.74rem;}
      .chart-svg{width:100%;height:220px;display:block;}
      .grid-line{stroke:rgba(255,255,255,.06);stroke-width:1;}
      .axis{font-size:10px;fill:var(--rs-text-muted);font-family:var(--rs-font-body);}

      /* DONUT */
      .donut-wrap{display:flex;flex-direction:column;align-items:center;gap:1rem;padding-top:.5rem;}
      .donut{width:160px;height:160px;border-radius:50%;background:conic-gradient(#FF385C 0% 32%,#FFD93D 32% 53%,#667eea 53% 70%,#22c55e 70% 84%,#a855f7 84% 94%,#3b82f6 94% 100%);position:relative;}
      .donut::after{content:"";position:absolute;inset:18%;border-radius:50%;background:var(--rs-bg-cool-2);}
      .donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1;}
      .donut-num{font-family:var(--rs-font-display);font-size:1.6rem;font-weight:900;line-height:1;}
      .donut-lbl{font-size:.66rem;color:var(--rs-text-muted);text-transform:uppercase;letter-spacing:.6px;margin-top:2px;}
      .legend{display:flex;flex-direction:column;gap:.45rem;width:100%;}
      .leg{display:flex;align-items:center;gap:.55rem;font-size:.78rem;}
      .leg .sw{width:10px;height:10px;border-radius:3px;flex-shrink:0;}
      .leg .v{margin-left:auto;color:var(--rs-text-muted);font-weight:600;}

      /* TABLES */
      .tables{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
      .t-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:.9rem;}
      .t-t{font-weight:700;font-size:.9rem;}
      .seemore{font-size:.78rem;color:var(--rs-primary);font-weight:600;cursor:pointer;}
      table{width:100%;border-collapse:collapse;}
      th{font-size:.66rem;color:var(--rs-text-muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:.75rem 1rem;text-align:left;border-bottom:1px solid var(--rs-border-soft);}
      td{padding:.7rem 1rem;font-size:.83rem;border-bottom:1px solid rgba(255,255,255,.04);}
      tr:last-child td{border-bottom:none;}
      tr:hover td{background:rgba(255,255,255,.02);}
      .thumb{width:36px;height:50px;border-radius:6px;display:inline-block;vertical-align:middle;margin-right:.6rem;flex-shrink:0;}
      .row-title{display:inline-flex;flex-direction:column;vertical-align:middle;line-height:1.3;}
      .row-title b{font-size:.84rem;}
      .row-title small{font-size:.7rem;color:var(--rs-text-muted);}
      .right{text-align:right;}
      .gold{color:var(--rs-accent);font-weight:700;}

      /* BADGES */
      .badge{display:inline-flex;align-items:center;font-size:.68rem;font-weight:700;padding:.2rem .55rem;border-radius:50px;}
      .b-green{background:rgba(34,197,94,.15);color:#22c55e;}
      .b-yellow{background:rgba(245,158,11,.15);color:#f59e0b;}
      .b-red{background:rgba(239,68,68,.15);color:#ef4444;}
      .b-blue{background:rgba(59,130,246,.15);color:#3b82f6;}

      /* BUTTONS */
      .btn-primary{display:flex;align-items:center;gap:.4rem;background:var(--rs-grad-hero);color:#fff;border:none;border-radius:10px;padding:.6rem 1.2rem;font-size:.85rem;font-weight:700;cursor:pointer;font-family:var(--rs-font-body);}
      .btn-primary:disabled{opacity:.5;cursor:default;}
      .btn-ghost{background:var(--rs-bg-cool-3);color:var(--rs-text-muted);border:1px solid var(--rs-border-base);border-radius:10px;padding:.6rem 1.2rem;font-size:.85rem;cursor:pointer;font-family:var(--rs-font-body);}
      .act-btn{background:var(--rs-bg-cool-3);border:none;color:var(--rs-text-muted);width:30px;height:30px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;}

      /* FORM FIELDS */
      .field-lbl{font-size:.72rem;color:var(--rs-text-muted);font-weight:700;display:block;text-transform:uppercase;letter-spacing:.5px;margin-bottom:.3rem;}
      .field-in{width:100%;box-sizing:border-box;background:var(--rs-bg-cool-3);border:1px solid var(--rs-border-base);color:#fff;padding:.6rem .85rem;border-radius:8px;font-size:.85rem;outline:none;font-family:var(--rs-font-body);}
      .field-in:focus{border-color:var(--rs-primary);}
      .field-in::placeholder{color:rgba(136,146,164,.5);}
      select.field-in option{background:var(--rs-bg-cool-2);}

      /* MODALS */
      .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center;padding:1rem;}
      .modal-box{background:var(--rs-bg-cool);border:1px solid var(--rs-border-base);border-radius:20px;width:100%;max-width:620px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column;}
      .modal-hd{padding:1.1rem 1.4rem;border-bottom:1px solid var(--rs-border-soft);display:flex;align-items:center;justify-content:space-between;}

      /* TOAST */
      .toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:rgba(20,20,20,.97);border:1px solid var(--rs-border-base);border-radius:50px;padding:.65rem 1.4rem;color:#fff;font-size:var(--rs-body-sm);font-weight:600;box-shadow:var(--rs-shadow-lg);z-index:999;white-space:nowrap;}

      @media(max-width:900px){.sidebar{display:none;}.main{margin-left:0!important;}.kpis{grid-template-columns:repeat(2,1fr)!important;}.charts,.tables{grid-template-columns:1fr!important;}}
    `}</style>
    </>
  )
}

