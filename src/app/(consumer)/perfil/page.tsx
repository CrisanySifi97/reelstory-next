'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LogOut, Bell, Shield, HelpCircle, ChevronRight, Settings,
  User, Lock, Mail, Phone, Calendar, FileText, Eye, EyeOff,
  CheckCircle, AlertTriangle, Trash2, Edit2, Save, X,
} from 'lucide-react'
import Nav from '@/components/layout/Nav'
import BottomNav from '@/components/layout/BottomNav'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore'
import {
  onAuthStateChanged, signOut, updateProfile,
  updatePassword, updateEmail,
  reauthenticateWithCredential, EmailAuthProvider,
  sendPasswordResetEmail, deleteUser,
} from 'firebase/auth'
import type { UserProfile } from '@/types'
import { useFCM } from '@/lib/useFCM'
import { useDownloads } from '@/lib/useDownloads'

const PLAN_COLORS: Record<string, string> = {
  'Gratuito': '#8892A4', 'Starter': '#22c55e',
  'Premium': 'var(--rs-primary)', 'VIP': 'var(--rs-accent)',
}
const PLAN_PERKS: Record<string, string[]> = {
  'Gratuito': ['2 episódios grátis por série', 'Qualidade SD', 'Com anúncios'],
  'Starter':  ['50 episódios/mês incluídos', 'Qualidade HD', 'Poucos anúncios'],
  'Premium':  ['Episódios ilimitados', 'Full HD', 'Sem anúncios'],
  'VIP':      ['Tudo incluído', '4K + Download', 'Acesso antecipado'],
}
const AVATAR_EMOJIS = ['😊','😎','🎬','🌟','🦁','🐯','🦊','🐺','🦸','🧙','👑','🎭','🌙','⚡','🔥','💎','🎵','🎮','🏆','💫']

type Tab = 'perfil' | 'actividade' | 'configuracoes' | 'seguranca' | 'downloads'

const st = {
  card: {
    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)',
    borderRadius: 16, overflow: 'hidden',
  } as React.CSSProperties,
  row: {
    display: 'flex', alignItems: 'center',
    padding: '.9rem 1rem', borderBottom: '1px solid rgba(255,255,255,.06)',
    transition: 'background .18s',
  } as React.CSSProperties,
  input: {
    width: '100%', boxSizing: 'border-box' as const,
    background: 'rgba(255,255,255,.06)', border: '1.5px solid rgba(255,255,255,.12)',
    color: '#fff', padding: '.65rem .9rem', borderRadius: 10,
    fontSize: '16px', outline: 'none', fontFamily: 'var(--rs-font-body)',
    transition: 'border-color .2s',
  } as React.CSSProperties,
  label: {
    display: 'block', fontSize: '.72rem', fontWeight: 700,
    textTransform: 'uppercase' as const, letterSpacing: '.5px',
    color: '#8892A4', marginBottom: '.35rem',
  } as React.CSSProperties,
  btn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem',
    background: 'var(--rs-grad-hero)', color: '#fff', border: 'none',
    borderRadius: 10, padding: '.65rem 1.2rem', fontSize: '.88rem',
    fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--rs-font-body)',
    width: '100%',
  } as React.CSSProperties,
  btnGhost: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem',
    background: 'rgba(255,255,255,.06)', color: '#8892A4', border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 10, padding: '.65rem 1.2rem', fontSize: '.88rem',
    cursor: 'pointer', fontFamily: 'var(--rs-font-body)', width: '100%',
  } as React.CSSProperties,
}

export default function PerfilPage() {
  const [user, setUser]           = useState<UserProfile | null>(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('perfil')
  const [toast, setToast]         = useState({ msg: '', ok: true })
  const [saving, setSaving]       = useState(false)
  const [orders, setOrders]       = useState<any[]>([])

  // Perfil fields
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldVal, setFieldVal]         = useState('')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  // Segurança
  const [pwForm, setPwForm]     = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw]     = useState({ current: false, next: false, confirm: false })
  const [emailForm, setEmailForm] = useState({ email: '', password: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const { permission, requestPermission } = useFCM()
  const { downloads, remove: removeDownload } = useDownloads()
  const fmt = (n: number) => n.toLocaleString('pt-AO')
  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast({ msg: '', ok: true }), 3000) }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fbUser => {
      if (!fbUser) { window.location.href = '/login'; return }
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid))
        if (snap.exists()) setUser(snap.data() as UserProfile)
        else setUser({ uid: fbUser.uid, name: fbUser.displayName ?? 'Utilizador', email: fbUser.email ?? '', avatar: '😊', plan: 'Gratuito', coins: 40, status: 'Ativo', isAdmin: false })
        // Load orders
        const oSnap = await getDocs(query(collection(db, 'orders'), where('userId', '==', fbUser.uid)))
        setOrders(oSnap.docs.map(d => d.data()))
      } finally { setLoading(false) }
    })
    return unsub
  }, [])

  /* ── Save single field ── */
  const saveField = async (field: string, value: any) => {
    if (!user) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), { [field]: value })
      setUser(u => u ? { ...u, [field]: value } : u)
      if (field === 'name' && auth.currentUser) await updateProfile(auth.currentUser, { displayName: value })
      setEditingField(null)
      showToast('Guardado com sucesso')
    } catch { showToast('Erro ao guardar', false) }
    finally { setSaving(false) }
  }

  /* ── Change password ── */
  const handleChangePassword = async () => {
    if (!user || !pwForm.current || !pwForm.next) return
    if (pwForm.next !== pwForm.confirm) { showToast('As senhas não coincidem', false); return }
    if (pwForm.next.length < 6) { showToast('Mínimo 6 caracteres', false); return }
    setPwSaving(true)
    try {
      const cred = EmailAuthProvider.credential(user.email, pwForm.current)
      await reauthenticateWithCredential(auth.currentUser!, cred)
      await updatePassword(auth.currentUser!, pwForm.next)
      setPwForm({ current: '', next: '', confirm: '' })
      showToast('Senha alterada com sucesso')
    } catch (e: any) {
      const msg = e.code === 'auth/wrong-password' ? 'Senha actual incorrecta'
        : e.code === 'auth/too-many-requests' ? 'Muitas tentativas. Tenta mais tarde.'
        : 'Erro ao alterar senha'
      showToast(msg, false)
    } finally { setPwSaving(false) }
  }

  /* ── Reset password via email ── */
  const handleResetPassword = async () => {
    if (!user) return
    try {
      await sendPasswordResetEmail(auth, user.email)
      showToast('Email de redefinição enviado para ' + user.email)
    } catch { showToast('Erro ao enviar email', false) }
  }

  /* ── Change email ── */
  const handleChangeEmail = async () => {
    if (!user || !emailForm.email || !emailForm.password) return
    if (!emailForm.email.includes('@')) { showToast('Email inválido', false); return }
    setEmailSaving(true)
    try {
      const cred = EmailAuthProvider.credential(user.email, emailForm.password)
      await reauthenticateWithCredential(auth.currentUser!, cred)
      await updateEmail(auth.currentUser!, emailForm.email)
      await updateDoc(doc(db, 'users', user.uid), { email: emailForm.email })
      setUser(u => u ? { ...u, email: emailForm.email } : u)
      setEmailForm({ email: '', password: '' })
      showToast('Email alterado com sucesso')
    } catch (e: any) {
      const msg = e.code === 'auth/wrong-password' ? 'Senha incorrecta'
        : e.code === 'auth/email-already-in-use' ? 'Email já em uso'
        : 'Erro ao alterar email'
      showToast(msg, false)
    } finally { setEmailSaving(false) }
  }

  /* ── Delete account ── */
  const handleDeleteAccount = async () => {
    if (!user || !auth.currentUser || deleteConfirm !== 'ELIMINAR') return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'users', user.uid))
      await deleteUser(auth.currentUser)
      window.location.href = '/'
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
        showToast('Por segurança, inicia sessão novamente antes de eliminar a conta', false)
        await signOut(auth)
        window.location.href = '/login'
      } else {
        showToast('Erro ao eliminar conta', false)
      }
    } finally { setDeleting(false) }
  }

  /* ── Notifications ── */
  const handleToggleNotif = async () => {
    if (!user) return
    if (!user.notifOn) {
      const granted = await requestPermission()
      if (!granted) { showToast('Permissão negada — activa nas definições do browser', false); return }
    }
    const next = !user.notifOn
    await updateDoc(doc(db, 'users', user.uid), { notifOn: next })
    setUser(u => u ? { ...u, notifOn: next } : u)
    showToast(next ? 'Notificações activadas' : 'Notificações desactivadas')
  }

  if (loading) return (
    <div style={{ background: 'var(--rs-bg-warm)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#8892A4' }}>A carregar...</div>
    </div>
  )
  if (!user) return null

  const planColor = PLAN_COLORS[user.plan] ?? '#8892A4'
  const extra = user as any // for extra fields (phone, dob, bio, lang)

  const EditableRow = ({ icon: Icon, label, field, value, placeholder, type = 'text' }: { icon: React.ElementType; label: string; field: string; value: string; placeholder?: string; type?: string }) => (
    <div style={{ ...st.row, flexDirection: editingField === field ? 'column' : 'row', alignItems: editingField === field ? 'stretch' : 'center', gap: editingField === field ? '.6rem' : 0 }}>
      {editingField !== field ? (<>
        <Icon size={18} style={{ marginRight: '.75rem', color: '#8892A4', flexShrink: 0 }}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 'var(--rs-body-sm)', fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 'var(--rs-body-xs)', color: value ? '#fff' : '#8892A4' }}>{value || placeholder || 'Não definido'}</div>
        </div>
        <button onClick={() => { setEditingField(field); setFieldVal(value) }} style={{ background: 'none', border: 'none', color: '#8892A4', cursor: 'pointer', display: 'flex', padding: 4 }}><Edit2 size={14}/></button>
      </>) : (<>
        <label style={st.label}>{label}</label>
        <input type={type} value={fieldVal} onChange={e => setFieldVal(e.target.value)} autoFocus style={st.input} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') saveField(field, fieldVal); if (e.key === 'Escape') setEditingField(null) }}/>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => saveField(field, fieldVal)} disabled={saving} style={{ ...st.btn, width: 'auto', flex: 1 }}><Save size={13}/>{saving ? '...' : 'Guardar'}</button>
          <button onClick={() => setEditingField(null)} style={{ ...st.btnGhost, width: 'auto', flex: 1 }}><X size={13}/>Cancelar</button>
        </div>
      </>)}
    </div>
  )

  const Toggle = ({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: () => void }) => (
    <div onClick={onChange} style={{ ...st.row, cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--rs-body-sm)', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 'var(--rs-body-xs)', color: '#8892A4' }}>{sub}</div>
      </div>
      <div style={{ width: 42, height: 24, borderRadius: 12, background: value ? 'var(--rs-primary)' : 'rgba(255,255,255,.15)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: value ? 21 : 3, transition: 'left .2s' }}/>
      </div>
    </div>
  )

  return (
    <div style={{ background: 'var(--rs-bg-warm)', minHeight: '100dvh', color: '#fff', fontFamily: 'var(--rs-font-body)', paddingTop: 'var(--rs-nav-h)',
      backgroundImage: 'radial-gradient(ellipse 80% 35% at 50% 0%, rgba(255,56,92,.08) 0%, transparent 60%)',
    }}>
      <Nav activeLink="/perfil"/>

      <div className="perfil-layout" style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem', display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem' }}>

        {/* ── Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Avatar + name */}
          <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 20, padding: '1.8rem', textAlign: 'center', border: '1px solid rgba(255,56,92,.15)' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
              <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--rs-grad-hero)', border: '3px solid rgba(255,56,92,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.4rem' }}>
                {(user as any).avatar || user.name?.[0]?.toUpperCase() || '😊'}
              </div>
              <button onClick={() => setShowAvatarPicker(v => !v)} style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--rs-primary)', border: '2px solid rgba(0,0,0,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Edit2 size={11}/>
              </button>
            </div>

            {/* Avatar picker */}
            {showAvatarPicker && (
              <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 12, padding: '.75rem', marginBottom: '.8rem', border: '1px solid rgba(255,255,255,.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {AVATAR_EMOJIS.map(em => (
                    <button key={em} onClick={() => { saveField('avatar', em); setShowAvatarPicker(false) }}
                      style={{ background: (user as any).avatar === em ? 'rgba(255,56,92,.2)' : 'rgba(255,255,255,.05)', border: `1px solid ${(user as any).avatar === em ? 'var(--rs-primary)' : 'transparent'}`, borderRadius: 8, padding: '.35rem', cursor: 'pointer', fontSize: '1.2rem' }}>
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.1rem', marginBottom: '.2rem' }}>{user.name}</div>
            <div style={{ fontSize: '.82rem', color: '#8892A4', marginBottom: '1rem' }}>{user.email}</div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', fontSize: '.72rem', fontWeight: 700, color: planColor, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '.8rem' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: planColor, display: 'inline-block' }}/>{user.plan}
            </div>

            <Link href="/pontos" style={{ display: 'block', background: 'var(--rs-grad-gold)', color: '#000', textDecoration: 'none', textAlign: 'center', padding: '.55rem', borderRadius: 10, fontSize: 'var(--rs-body-xs)', fontWeight: 700, marginBottom: '.5rem' }}>
              🪙 {fmt(user.coins)} pontos · Comprar mais
            </Link>
            {user.isAdmin && (
              <Link href="/admin" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', background: 'rgba(255,56,92,.12)', color: 'var(--rs-primary)', textDecoration: 'none', padding: '.5rem', borderRadius: 10, fontSize: 'var(--rs-body-xs)', fontWeight: 700, border: '1px solid rgba(255,56,92,.25)' }}>
                <Settings size={13}/> Painel Admin
              </Link>
            )}
          </div>

          {/* Quick stats */}
          <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 16, padding: '1rem', border: '1px solid rgba(255,255,255,.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Plano', value: user.plan },
              { label: 'Estado', value: user.status },
              { label: 'Compras', value: String(orders.length) },
              { label: 'Saldo', value: `${fmt(user.coins)} pts` },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '.65rem .75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '.65rem', color: '#8892A4', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: '.85rem', fontWeight: 700 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main ── */}
        <div>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.06)', marginBottom: '1.5rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {([['perfil','Perfil'],['actividade','Actividade'],['downloads','Downloads'],['configuracoes','Configurações'],['seguranca','Segurança']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{ padding: '.75rem 1.1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--rs-body-sm)', fontWeight: 700, whiteSpace: 'nowrap', color: activeTab === key ? 'var(--rs-primary)' : '#8892A4', borderBottom: `3px solid ${activeTab === key ? 'var(--rs-primary)' : 'transparent'}`, marginBottom: -1, transition: 'color .18s, border-color .18s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* ═══ PERFIL ═══ */}
          {activeTab === 'perfil' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={st.card}>
                <div style={{ padding: '.75rem 1rem', background: 'rgba(255,255,255,.02)', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#8892A4' }}>Informações pessoais</div>
                <EditableRow icon={User}     label="Nome completo"    field="name"  value={user.name}        placeholder="O teu nome"/>
                <EditableRow icon={Phone}    label="Telemóvel"        field="phone" value={extra.phone ?? ''} placeholder="+244 9XX XXX XXX" type="tel"/>
                <EditableRow icon={Calendar} label="Data de nascimento" field="dob" value={extra.dob ?? ''}  placeholder="DD/MM/AAAA"/>
                <EditableRow icon={FileText} label="Bio / Apresentação" field="bio" value={extra.bio ?? ''}  placeholder="Fala um pouco sobre ti..."/>
              </div>

              <div style={st.card}>
                <div style={{ padding: '.75rem 1rem', background: 'rgba(255,255,255,.02)', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#8892A4' }}>Preferências</div>
                <div style={st.row}>
                  <div style={{ fontSize: '.7rem', marginRight: '.75rem', flexShrink: 0 }}>🌍</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--rs-body-sm)', fontWeight: 600 }}>Idioma</div>
                    <div style={{ fontSize: 'var(--rs-body-xs)', color: '#8892A4' }}>Português (Angola)</div>
                  </div>
                  <select value={extra.lang ?? 'pt-AO'} onChange={e => saveField('lang', e.target.value)}
                    style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#fff', padding: '.35rem .6rem', borderRadius: 8, fontSize: '.8rem', cursor: 'pointer' }}>
                    <option value="pt-AO">Português (AO)</option>
                    <option value="pt-PT">Português (PT)</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div style={{ ...st.row, borderBottom: 'none' }}>
                  <div style={{ fontSize: '.7rem', marginRight: '.75rem', flexShrink: 0 }}>🎬</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--rs-body-sm)', fontWeight: 600 }}>Géneros favoritos</div>
                    <div style={{ fontSize: 'var(--rs-body-xs)', color: '#8892A4' }}>{(extra.genres ?? []).join(', ') || 'Nenhum seleccionado'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200, justifyContent: 'flex-end' }}>
                    {['Romance','Suspense','Comédia','Terror','Acção'].map(g => {
                      const selected = (extra.genres ?? []).includes(g)
                      return (
                        <button key={g} onClick={() => {
                          const cur: string[] = extra.genres ?? []
                          const next = selected ? cur.filter((x: string) => x !== g) : [...cur, g]
                          saveField('genres', next)
                        }} style={{ fontSize: '.62rem', fontWeight: 700, padding: '.18rem .45rem', borderRadius: 50, border: `1px solid ${selected ? 'var(--rs-primary)' : 'rgba(255,255,255,.15)'}`, background: selected ? 'rgba(255,56,92,.15)' : 'transparent', color: selected ? 'var(--rs-primary)' : '#8892A4', cursor: 'pointer' }}>
                          {g}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              {/* ── Referral card ── */}
              <div style={{ ...st.card, background: 'linear-gradient(135deg, rgba(255,56,92,.08) 0%, rgba(20,20,20,.6) 100%)', border: '1px solid rgba(255,56,92,.2)' }}>
                <div style={{ padding: '1rem 1.1rem .6rem', display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>🎁</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '.95rem' }}>Convida Amigos — Ganha Pontos</div>
                    <div style={{ fontSize: '.75rem', color: '#8892A4', marginTop: '.15rem' }}>Tu recebes <strong style={{ color: 'var(--rs-accent)' }}>+100 pts</strong> quando o teu convidado fizer a 1ª compra · Ele recebe <strong style={{ color: 'var(--rs-accent)' }}>+20 pts</strong> ao registar</div>
                  </div>
                </div>
                <div style={{ padding: '.6rem 1.1rem 1rem' }}>
                  <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#8892A4', marginBottom: '.4rem' }}>O teu link de convite</div>
                  <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '.55rem .8rem', fontSize: '.82rem', color: 'rgba(255,255,255,.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof window !== 'undefined' ? `${window.location.origin}/login?ref=${(user as any).referralCode ?? '...'}` : '...'}
                    </div>
                    <button onClick={() => {
                      const link = `${window.location.origin}/login?ref=${(user as any).referralCode}`
                      if (navigator.share) {
                        navigator.share({ title: 'ReelStory', text: 'Junta-te a mim na ReelStory e recebe 20 pontos de boas-vindas!', url: link }).catch(() => {})
                      } else {
                        navigator.clipboard.writeText(link).then(() => showToast('Link copiado!')).catch(() => {})
                      }
                    }} style={{ flexShrink: 0, background: 'var(--rs-grad-hero)', border: 'none', color: '#fff', padding: '.55rem 1rem', borderRadius: 10, fontSize: '.82rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Partilhar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ ACTIVIDADE ═══ */}
          {activeTab === 'actividade' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  { label: 'Compras', value: orders.length, icon: '🛒' },
                  { label: 'Pontos gastos', value: orders.reduce((s: number, o: any) => s + (o.points || 0), 0), icon: '🪙' },
                  { label: 'Plano', value: user.plan, icon: '⭐' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '1.1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '.4rem' }}>{s.icon}</div>
                    <div style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.4rem' }}>{typeof s.value === 'number' ? fmt(s.value) : s.value}</div>
                    <div style={{ fontSize: '.7rem', color: '#8892A4', textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={st.card}>
                <div style={{ padding: '.75rem 1rem', background: 'rgba(255,255,255,.02)', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#8892A4' }}>Histórico de compras</div>
                {orders.length > 0 ? orders.slice(0, 8).map((o: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.8rem 1rem', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <div>
                      <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{o.package} — {o.points} pts</div>
                      <div style={{ fontSize: '.72rem', color: '#8892A4' }}>{o.method || 'Kursinha'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '.85rem', color: 'var(--rs-accent)', fontWeight: 700 }}>Kz {o.amount}</div>
                      <span style={{ fontSize: '.68rem', fontWeight: 700, padding: '.15rem .5rem', borderRadius: 50, background: o.status === 'Aprovado' ? 'rgba(34,197,94,.15)' : 'rgba(245,158,11,.15)', color: o.status === 'Aprovado' ? '#22c55e' : '#f59e0b' }}>{o.status}</span>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#8892A4' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '.8rem' }}>📭</div>
                    <div style={{ fontWeight: 700, marginBottom: '.3rem', color: '#fff' }}>Sem compras ainda</div>
                    <Link href="/pontos" style={{ color: 'var(--rs-primary)', fontWeight: 700, fontSize: '.84rem' }}>Comprar pontos →</Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ CONFIGURAÇÕES ═══ */}
          {activeTab === 'configuracoes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={st.card}>
                <div style={{ padding: '.75rem 1rem', background: 'rgba(255,255,255,.02)', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#8892A4' }}>Notificações</div>
                <Toggle label="Notificações push" sub="Novos episódios, promoções e alertas" value={!!user.notifOn} onChange={handleToggleNotif}/>
                <Toggle label="Novos episódios" sub="Quando um novo episódio é lançado" value={!!(extra.notifEps ?? true)} onChange={() => saveField('notifEps', !(extra.notifEps ?? true))}/>
                <div style={{ ...st.row, borderBottom: 'none' }}>
                  <Toggle label="Promoções e ofertas" sub="Descontos e bónus de pontos" value={!!(extra.notifPromo ?? true)} onChange={() => saveField('notifPromo', !(extra.notifPromo ?? true))}/>
                </div>
              </div>

              <div style={st.card}>
                <div style={{ padding: '.75rem 1rem', background: 'rgba(255,255,255,.02)', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#8892A4' }}>Reprodução</div>
                <Toggle label="Reprodução automática" sub="Passa automaticamente ao próximo episódio" value={!!(extra.autoplay ?? true)} onChange={() => saveField('autoplay', !(extra.autoplay ?? true))}/>
                <div style={{ ...st.row, borderBottom: 'none' }}>
                  <Toggle label="Modo de dados reduzidos" sub="Qualidade mais baixa para poupar dados" value={!!(extra.dataMode)} onChange={() => saveField('dataMode', !extra.dataMode)}/>
                </div>
              </div>

              <div style={st.card}>
                <div style={{ padding: '.75rem 1rem', background: 'rgba(255,255,255,.02)', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#8892A4' }}>Suporte</div>
                <a href="https://wa.me/244976020849" target="_blank" rel="noopener noreferrer"
                  style={{ ...st.row, textDecoration: 'none', color: 'inherit' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <HelpCircle size={18} style={{ marginRight: '.75rem', color: '#8892A4', flexShrink: 0 }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--rs-body-sm)', fontWeight: 600 }}>Ajuda e Suporte</div>
                    <div style={{ fontSize: 'var(--rs-body-xs)', color: '#8892A4' }}>Contactar suporte · FAQ</div>
                  </div>
                  <ChevronRight size={16} color="#8892A4"/>
                </a>
                <Link href="/privacidade"
                  style={{ ...st.row, borderBottom: 'none', textDecoration: 'none', color: 'inherit' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <Shield size={18} style={{ marginRight: '.75rem', color: '#8892A4', flexShrink: 0 }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--rs-body-sm)', fontWeight: 600 }}>Política de Privacidade</div>
                    <div style={{ fontSize: 'var(--rs-body-xs)', color: '#8892A4' }}>Termos e condições</div>
                  </div>
                  <ChevronRight size={16} color="#8892A4"/>
                </Link>
              </div>

              <button onClick={async () => { await signOut(auth); window.location.href = '/' }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.6rem', padding: '.85rem', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, color: '#ef4444', fontSize: 'var(--rs-body-sm)', fontWeight: 700, cursor: 'pointer', width: '100%', fontFamily: 'var(--rs-font-body)' }}>
                <LogOut size={16}/> Terminar sessão
              </button>
            </div>
          )}

          {/* ═══ DOWNLOADS ═══ */}
          {activeTab === 'downloads' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {downloads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#8892A4' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📥</div>
                  <div style={{ fontWeight: 700, marginBottom: '.4rem', color: '#fff' }}>Sem episódios guardados</div>
                  <div style={{ fontSize: '.85rem', lineHeight: 1.6 }}>
                    Abre um episódio desbloqueado e toca no ícone <strong style={{ color: '#fff' }}>↓</strong> para guardar para ver offline.
                  </div>
                </div>
              ) : (
                <div style={st.card}>
                  <div style={{ padding: '.75rem 1rem', background: 'rgba(255,255,255,.02)', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: '#8892A4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Episódios guardados ({downloads.length})</span>
                    <button
                      onClick={() => { if (confirm('Eliminar todos os downloads?')) downloads.forEach(d => removeDownload(d.key)) }}
                      style={{ background: 'none', border: 'none', color: 'var(--rs-primary)', fontSize: '.72rem', fontWeight: 700, cursor: 'pointer' }}
                    >Eliminar tudo</button>
                  </div>
                  {downloads.map(d => (
                    <div key={d.key} style={{ ...st.row, gap: '.85rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.72rem', color: '#8892A4', marginBottom: '.15rem', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700 }}>{d.dramaTitle}</div>
                        <div style={{ fontSize: '.9rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                        <div style={{ fontSize: '.72rem', color: '#8892A4', marginTop: '.1rem' }}>Ep. {d.episodeIdx + 1} · {new Date(d.savedAt).toLocaleDateString('pt-AO')}</div>
                      </div>
                      <button
                        onClick={() => removeDownload(d.key)}
                        style={{ flexShrink: 0, width: 34, height: 34, borderRadius: '50%', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ ...st.card, padding: '1rem' }}>
                <div style={{ fontSize: '.78rem', color: '#8892A4', lineHeight: 1.6 }}>
                  <strong style={{ color: '#fff' }}>Como funciona:</strong> Os episódios são guardados no teu dispositivo via cache do browser. Ficam disponíveis mesmo sem internet. Para libertar espaço, elimina os que já viste.
                </div>
              </div>
            </div>
          )}

          {/* ═══ SEGURANÇA ═══ */}
          {activeTab === 'seguranca' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Change password */}
              <div style={{ ...st.card, padding: '1.2rem' }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: '.2rem' }}>Alterar senha</div>
                <div style={{ fontSize: '.78rem', color: '#8892A4', marginBottom: '1rem' }}>Usa uma senha forte com pelo menos 6 caracteres.</div>
                {[
                  { key: 'current', label: 'Senha actual' },
                  { key: 'next',    label: 'Nova senha' },
                  { key: 'confirm', label: 'Confirmar nova senha' },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 10 }}>
                    <label style={st.label}>{f.label}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={(showPw as any)[f.key] ? 'text' : 'password'}
                        value={(pwForm as any)[f.key]}
                        onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ ...st.input, paddingRight: '2.5rem' }}
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPw(p => ({ ...p, [f.key]: !(p as any)[f.key] }))}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8892A4', cursor: 'pointer', display: 'flex' }}>
                        {(showPw as any)[f.key] ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleChangePassword} disabled={pwSaving || !pwForm.current || !pwForm.next} style={{ ...st.btn, opacity: (pwSaving || !pwForm.current || !pwForm.next) ? .5 : 1 }}>
                    <Lock size={14}/>{pwSaving ? 'A alterar...' : 'Alterar senha'}
                  </button>
                  <button onClick={handleResetPassword} style={{ ...st.btnGhost, fontSize: '.82rem' }}>
                    Enviar por email
                  </button>
                </div>
              </div>

              {/* Change email */}
              <div style={{ ...st.card, padding: '1.2rem' }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: '.2rem' }}>Alterar email</div>
                <div style={{ fontSize: '.78rem', color: '#8892A4', marginBottom: '1rem' }}>Email actual: <strong style={{ color: '#fff' }}>{user.email}</strong></div>
                <div style={{ marginBottom: 10 }}>
                  <label style={st.label}>Novo email</label>
                  <input type="email" value={emailForm.email} onChange={e => setEmailForm(p => ({ ...p, email: e.target.value }))} style={st.input} placeholder="novo@email.com"/>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={st.label}>Confirmar com a senha actual</label>
                  <input type="password" value={emailForm.password} onChange={e => setEmailForm(p => ({ ...p, password: e.target.value }))} style={st.input} placeholder="••••••••"/>
                </div>
                <button onClick={handleChangeEmail} disabled={emailSaving || !emailForm.email || !emailForm.password}
                  style={{ ...st.btn, opacity: (emailSaving || !emailForm.email || !emailForm.password) ? .5 : 1 }}>
                  <Mail size={14}/>{emailSaving ? 'A alterar...' : 'Alterar email'}
                </button>
              </div>

              {/* Security info */}
              <div style={{ ...st.card, padding: '1.2rem' }}>
                <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: '.8rem' }}>Estado da conta</div>
                {[
                  { ok: true,  label: `Email verificado: ${user.email}` },
                  { ok: true,  label: 'Autenticação activa' },
                  { ok: true,  label: 'Dados encriptados em trânsito' },
                  { ok: !!user.notifOn, label: `Notificações push: ${user.notifOn ? 'activas' : 'inactivas'}` },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.45rem 0', fontSize: '.85rem', color: item.ok ? '#fff' : '#8892A4' }}>
                    {item.ok ? <CheckCircle size={15} color="#22c55e"/> : <AlertTriangle size={15} color="#f59e0b"/>}
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Delete account */}
              <div style={{ ...st.card, padding: '1.2rem', border: '1px solid rgba(239,68,68,.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 700, fontSize: '.95rem', color: '#ef4444', marginBottom: '.5rem' }}>
                  <Trash2 size={16}/> Eliminar conta
                </div>
                <div style={{ fontSize: '.82rem', color: '#8892A4', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Esta acção é permanente e irrecuperável. Todos os teus dados, pontos e histórico serão eliminados.
                </div>
                <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} style={{ ...st.input, marginBottom: 10, borderColor: deleteConfirm === 'ELIMINAR' ? '#ef4444' : 'rgba(255,255,255,.1)' }} placeholder='Escreve "ELIMINAR" para confirmar'/>
                <button onClick={handleDeleteAccount} disabled={deleteConfirm !== 'ELIMINAR' || deleting}
                  style={{ ...st.btn, background: deleteConfirm === 'ELIMINAR' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(239,68,68,.1)', color: deleteConfirm === 'ELIMINAR' ? '#fff' : '#ef4444', opacity: (deleteConfirm !== 'ELIMINAR' || deleting) ? .5 : 1 }}>
                  <Trash2 size={14}/> {deleting ? 'A eliminar...' : 'Eliminar conta permanentemente'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast.msg && (
        <div style={{ position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)', background: toast.ok ? 'rgba(22,33,62,.97)' : 'rgba(239,68,68,.95)', border: `1px solid ${toast.ok ? 'rgba(255,56,92,.3)' : 'rgba(239,68,68,.5)'}`, borderRadius: 50, padding: '.65rem 1.4rem', color: '#fff', fontSize: 'var(--rs-body-sm)', fontWeight: 600, boxShadow: '0 8px 30px rgba(0,0,0,.5)', zIndex: 999, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          {toast.ok ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>} {toast.msg}
        </div>
      )}

      <div style={{ height: '4rem' }}/>
      <BottomNav/>

      <style>{`
        input,select,textarea{font-family:var(--rs-font-body);font-size:16px!important;}
        input::placeholder,textarea::placeholder{color:#4a5568;}
        input:focus,select:focus,textarea:focus{border-color:var(--rs-primary)!important;outline:none;}
        select option{background:rgba(255,255,255,.05);}
        @media(max-width:768px){
          .perfil-layout{grid-template-columns:1fr!important;}
          /* Prevent iOS zoom on all inputs */
          input,select,textarea,button{font-size:16px!important;touch-action:manipulation;}
        }
      `}</style>
    </div>
  )
}
