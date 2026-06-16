'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, Phone, ArrowRight } from 'lucide-react'
import { auth, db } from '@/lib/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { DRAMAS } from '@/lib/mock'

type Mode   = 'login' | 'register'
type Method = 'email' | 'phone'

const COL1_DEFAULT = [...DRAMAS.slice(0, 4), ...DRAMAS.slice(0, 4)]
const COL2_DEFAULT = [...DRAMAS.slice(4, 8), ...DRAMAS.slice(4, 8)]
const COL3_DEFAULT = [...DRAMAS.slice(8, 12), ...DRAMAS.slice(8, 12)]

export default function LoginPage() {
  // email / register state
  const [mode, setMode]           = useState<Mode>('login')
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [pass, setPass]           = useState('')
  const [showPass, setShowPass]   = useState(false)

  // phone state
  const [method, setMethod]           = useState<Method>('email')
  const [phone, setPhone]             = useState('')
  const [otp, setOtp]                 = useState('')
  const [otpSent, setOtpSent]         = useState(false)
  const [confirmResult, setConfirm]   = useState<ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

  // shared
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [nextUrl, setNextUrl]         = useState('/inicio')
  const [isAdminLogin, setIsAdminLogin] = useState(false)
  const [refCode, setRefCode]         = useState('')
  const [loginBanner, setLoginBanner] = useState<{
    tagline:string; s1n:string; s1l:string; s2n:string; s2l:string; s3n:string; s3l:string; active:boolean; images?:string[]
  }>({ tagline:'Desbloqueia episódios com pontos. Sem mensalidades.', s1n:'500+', s1l:'Dramas', s2n:'2M+', s2l:'Fãs', s3n:'4.9★', s3l:'Avaliação', active:true, images:[] })

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get('mode') === 'register') setMode('register')
    const next = q.get('next')
    const allowed = ['/inicio','/explorar','/lista','/perfil','/pontos','/detalhe','/feed','/admin']
    let resolvedNext = '/inicio'
    if (next && allowed.some(p => next.startsWith(p))) {
      resolvedNext = next
      setNextUrl(next)
      if (next.startsWith('/admin')) setIsAdminLogin(true)
    }
    const ref = q.get('ref')
    let resolvedRef = ''
    if (ref && /^[A-Z0-9]{6,10}$/.test(ref)) { resolvedRef = ref; setRefCode(ref) }
    getDoc(doc(db,'banners','login')).then(s=>{ if (s.exists() && s.data().active!==false) setLoginBanner(p=>({...p,...s.data()})) }).catch(()=>{})

    let redirected = false
    const goNext = (uid: string, email: string, displayName: string) => {
      if (redirected) return
      redirected = true
      setLoading(true)
      createUserDoc(uid, email, displayName, resolvedRef || undefined).catch(() => {})
      window.location.href = resolvedNext
    }

    getRedirectResult(auth).then(cred => {
      if (cred) goNext(cred.user.uid, cred.user.email ?? '', cred.user.displayName ?? 'Utilizador')
    }).catch((err: unknown) => {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/unauthorized-domain')
        setError('Domínio não autorizado — adiciona reelstory-next.vercel.app em Firebase Console > Authentication > Authorized domains')
      else if (code)
        setError(`Erro Google: ${code}`)
    })

    let unsub = () => {}
    if (sessionStorage.getItem('rs_google_redirect') === '1') {
      sessionStorage.removeItem('rs_google_redirect')
      unsub = onAuthStateChanged(auth, user => {
        if (user) goNext(user.uid, user.email ?? '', user.displayName ?? 'Utilizador')
      })
    }
    return () => unsub()
  }, [])

  const createUserDoc = async (uid: string, emailOrPhone: string, displayName: string, inviteCode?: string) => {
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        email: emailOrPhone.includes('@') ? emailOrPhone : '',
        phone: emailOrPhone.includes('@') ? '' : emailOrPhone,
        name: displayName,
        avatar: displayName[0]?.toUpperCase() ?? 'U',
        plan: 'Gratuito',
        coins: 40 + (inviteCode ? 20 : 0),
        status: 'Ativo',
        isAdmin: false,
        referralCode: uid.slice(0, 8).toUpperCase(),
        referredBy: inviteCode || null,
        referralBonusPaid: false,
        createdAt: serverTimestamp(),
      })
    } else if (!snap.data().referralCode) {
      await updateDoc(ref, { referralCode: uid.slice(0, 8).toUpperCase() })
    }
  }

  /* ── Email / password ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email, pass)
        createUserDoc(cred.user.uid, email, cred.user.displayName ?? email.split('@')[0]).catch(() => {})
      } else {
        if (!name.trim()) { setError('Introduz o teu nome'); setLoading(false); return }
        const cred = await createUserWithEmailAndPassword(auth, email, pass)
        await updateProfile(cred.user, { displayName: name.trim() })
        createUserDoc(cred.user.uid, email, name.trim(), refCode || undefined).catch(() => {})
      }
      window.location.href = nextUrl
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const msg  = (err as { message?: string }).message ?? ''
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential')
        setError('Email ou senha incorretos')
      else if (code === 'auth/email-already-in-use') setError('Este email já está em uso')
      else if (code === 'auth/weak-password') setError('A senha deve ter pelo menos 6 caracteres')
      else if (code === 'auth/invalid-email') setError('Email inválido')
      else if (code === 'auth/unauthorized-domain') setError('Domínio não autorizado')
      else if (code === 'auth/operation-not-allowed') setError('Email/Password não activo — activa em Firebase Console')
      else if (code === 'auth/too-many-requests') setError('Muitas tentativas. Aguarda uns minutos.')
      else if (code === 'auth/network-request-failed') setError('Erro de rede. Verifica a ligação.')
      else setError(`Erro: ${code || msg || 'desconhecido'}`)
    } finally { setLoading(false) }
  }

  /* ── Google ── */
  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      sessionStorage.setItem('rs_google_redirect', '1')
      await signInWithRedirect(auth, new GoogleAuthProvider())
    } catch (err: unknown) {
      sessionStorage.removeItem('rs_google_redirect')
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/unauthorized-domain')
        setError('Domínio não autorizado — adiciona reelstory-next.vercel.app em Firebase Console > Authentication > Authorized domains')
      else setError(`Erro Google: ${code || 'desconhecido'}`)
      setLoading(false)
    }
  }

  /* ── Phone: send OTP ── */
  const handleSendOtp = async () => {
    setError('')
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 9) { setError('Introduz 9 dígitos (ex: 923 456 789)'); return }
    const phoneNumber = `+244${digits.slice(-9)}`
    setLoading(true)
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
      }
      const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaRef.current)
      setConfirm(result)
      setOtpSent(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/invalid-phone-number') setError('Número de telefone inválido')
      else if (code === 'auth/too-many-requests') setError('Muitas tentativas. Aguarda uns minutos.')
      else if (code === 'auth/operation-not-allowed') setError('Login por telefone não activo — activa em Firebase Console > Authentication > Sign-in method')
      else setError(`Erro: ${code || 'desconhecido'}`)
      recaptchaRef.current?.clear()
      recaptchaRef.current = null
    } finally { setLoading(false) }
  }

  /* ── Phone: verify OTP ── */
  const handleVerifyOtp = async () => {
    if (!confirmResult || otp.length < 6) { setError('Introduz o código de 6 dígitos'); return }
    setError('')
    setLoading(true)
    try {
      const cred = await confirmResult.confirm(otp)
      const user = cred.user
      const displayName = user.displayName || user.phoneNumber || `+244${phone.replace(/\D/g,'').slice(-9)}`
      createUserDoc(user.uid, user.phoneNumber ?? '', displayName, refCode || undefined).catch(() => {})
      window.location.href = nextUrl
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/invalid-verification-code') setError('Código inválido. Verifica o SMS.')
      else if (code === 'auth/code-expired') setError('Código expirado. Clica em "Reenviar".')
      else setError(`Erro: ${code || 'desconhecido'}`)
    } finally { setLoading(false) }
  }

  const switchMethod = (m: Method) => { setMethod(m); setError(''); setOtpSent(false); setOtp(''); setPhone('') }

  return (
    <div style={{ minHeight:'100dvh', display:'flex', background:'#1A1A2E', color:'#fff', fontFamily:'var(--rs-font-body)' }}>

      {/* ── Left: animated poster wall ── */}
      <div className="login-left" style={{ flex:1, background:'#0a0a14', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, zIndex:2, background:['linear-gradient(to bottom, #0a0a14 0%, transparent 18%, transparent 75%, #0a0a14 100%)','linear-gradient(to right, #0a0a14 0%, transparent 20%)'].join(', ') }} />
        <div style={{ position:'absolute', inset:0, zIndex:1, display:'flex', gap:10, padding:10, overflow:'hidden' }}>
          {(() => {
            const imgs = loginBanner.images && loginBanner.images.length >= 3 ? loginBanner.images : null
            const chunk = (arr: string[], n: number) => Array.from({length:n}, (_,i) => arr.filter((_,j)=>j%n===i))
            const [c1, c2, c3] = imgs ? chunk(imgs, 3) : [null, null, null]
            const cols = [
              { items: c1, fallback: COL1_DEFAULT, anim: 'scrollUp 32s linear infinite' },
              { items: c2, fallback: COL2_DEFAULT, anim: 'scrollDown 26s linear infinite' },
              { items: c3, fallback: COL3_DEFAULT, anim: 'scrollUp 40s linear infinite' },
            ]
            return cols.map((col, ci) => (
              <div key={ci} style={{ flex:1, display:'flex', flexDirection:'column', gap:10, animation:col.anim }}>
                {col.items && col.items.length > 0
                  ? [...col.items,...col.items].map((url,i) => (
                    <div key={i} style={{ borderRadius:14, aspectRatio:'2/3', flexShrink:0, overflow:'hidden', background:'#111' }}>
                      <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} onError={e=>(e.currentTarget.style.display='none')}/>
                    </div>
                  ))
                  : col.fallback.map((d,i) => (
                    <div key={i} style={{ borderRadius:14, aspectRatio:'2/3', flexShrink:0, background:d.posterGrad??'var(--rs-poster-romance)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.8rem' }}>
                      <span dangerouslySetInnerHTML={{ __html: d.icon }}/>
                    </div>
                  ))
                }
              </div>
            ))
          })()}
        </div>
        <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:3, padding:'2rem', textAlign:'center' }}>
          <Link href="/" style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'2.4rem', color:'#fff', textDecoration:'none', display:'block', marginBottom:'.5rem' }}>
            Reel<span style={{ color:'var(--rs-primary)' }}>Story</span>
          </Link>
          <div style={{ fontSize:'.88rem', color:'#8892A4', marginBottom:'1.2rem' }}>{loginBanner.tagline}</div>
          <div style={{ display:'flex', justifyContent:'center', gap:'2rem', flexWrap:'wrap' }}>
            {[{num:loginBanner.s1n,label:loginBanner.s1l},{num:loginBanner.s2n,label:loginBanner.s2l},{num:loginBanner.s3n,label:loginBanner.s3l}].map(s=>(
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.3rem', color:'var(--rs-primary)' }}>{s.num}</div>
                <div style={{ fontSize:'.7rem', color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.5px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div style={{ width:460, flexShrink:0, background:'#16213E', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
        <div style={{ width:'100%', maxWidth:380 }}>

          {/* Mobile logo */}
          <div className="login-mobile-logo" style={{ display:'none', textAlign:'center', marginBottom:'2rem' }}>
            <Link href="/" style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'2rem', color:'#fff', textDecoration:'none' }}>
              Reel<span style={{ color:'var(--rs-primary)' }}>Story</span>
            </Link>
          </div>

          {/* Admin badge */}
          {isAdminLogin && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:'.4rem', background:'rgba(255,56,92,.12)', border:'1px solid rgba(255,56,92,.3)', borderRadius:50, padding:'.3rem .9rem', fontSize:'.72rem', fontWeight:800, color:'var(--rs-primary)', letterSpacing:'.6px', textTransform:'uppercase', marginBottom:'1rem' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--rs-primary)', display:'inline-block' }}/> Acesso Administrador
            </div>
          )}

          <h1 style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.8rem', margin:'0 0 .3rem' }}>
            {mode === 'login' ? (isAdminLogin ? 'Admin ReelStory' : 'Bem-vindo de volta') : 'Criar conta'}
          </h1>
          <p style={{ fontSize:'.88rem', color:'#8892A4', margin:'0 0 1.5rem' }}>
            {mode === 'login' ? (isAdminLogin ? 'Entra com a conta de administrador' : 'Entra na tua conta ReelStory') : 'Junta-te à ReelStory hoje'}
          </p>

          {/* Method tabs — not shown for admin */}
          {!isAdminLogin && (
            <div style={{ display:'flex', background:'rgba(255,255,255,.05)', borderRadius:12, padding:4, marginBottom:'1.4rem', gap:4 }}>
              <button onClick={() => switchMethod('email')} style={{ flex:1, padding:'.55rem', borderRadius:8, border:'none', background: method==='email' ? 'rgba(255,255,255,.12)' : 'transparent', color: method==='email' ? '#fff' : '#8892A4', fontWeight:700, cursor:'pointer', fontSize:'.86rem', fontFamily:'var(--rs-font-body)', display:'flex', alignItems:'center', justifyContent:'center', gap:'.4rem', transition:'all .2s' }}>
                <Mail size={14}/> Email
              </button>
              <button onClick={() => switchMethod('phone')} style={{ flex:1, padding:'.55rem', borderRadius:8, border:'none', background: method==='phone' ? 'rgba(255,255,255,.12)' : 'transparent', color: method==='phone' ? '#fff' : '#8892A4', fontWeight:700, cursor:'pointer', fontSize:'.86rem', fontFamily:'var(--rs-font-body)', display:'flex', alignItems:'center', justifyContent:'center', gap:'.4rem', transition:'all .2s' }}>
                <Phone size={14}/> Telefone
              </button>
            </div>
          )}

          {/* ── EMAIL METHOD ── */}
          {(method === 'email' || isAdminLogin) && (
            <>
              <button onClick={handleGoogle} disabled={loading} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'.6rem', padding:'.78rem', background:'#fff', color:'#111', border:'none', borderRadius:12, fontSize:'var(--rs-body-md)', fontFamily:'var(--rs-font-body)', fontWeight:700, cursor:loading?'default':'pointer', marginBottom:'1.2rem', opacity:loading?.6:1, transition:'opacity .2s' }}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M45.7 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.2c-.5 2.7-2.1 5-4.4 6.5v5.4h7.1c4.2-3.8 6.8-9.5 6.8-15.9z"/>
                  <path fill="#34A853" d="M24 46c6.1 0 11.2-2 14.9-5.5l-7.1-5.4c-2 1.3-4.5 2.1-7.8 2.1-6 0-11.1-4-12.9-9.5H3.8v5.6C7.5 40.9 15.2 46 24 46z"/>
                  <path fill="#FBBC05" d="M11.1 27.7c-.5-1.4-.7-2.8-.7-4.3s.2-3 .7-4.3v-5.6H3.8C2.3 16.4 1.5 20.1 1.5 24s.8 7.6 2.3 10.5l7.3-6.8z"/>
                  <path fill="#EA4335" d="M24 9.5c3.3 0 6.3 1.1 8.6 3.4l6.4-6.4C35.1 2.8 30 .5 24 .5 15.2.5 7.5 5.6 3.8 13.1l7.3 6.8C12.9 14 18 9.5 24 9.5z"/>
                </svg>
                Continuar com Google
              </button>

              <div style={{ display:'flex', alignItems:'center', gap:'.8rem', marginBottom:'1.2rem' }}>
                <div style={{ flex:1, height:1, background:'rgba(255,255,255,.08)' }}/>
                <span style={{ fontSize:'var(--rs-body-xs)', color:'#8892A4' }}>ou com email</span>
                <div style={{ flex:1, height:1, background:'rgba(255,255,255,.08)' }}/>
              </div>

              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'.85rem' }}>
                {mode === 'register' && (
                  <div>
                    <label style={labelStyle}>Nome completo</label>
                    <input value={name} onChange={e=>setName(e.target.value)} placeholder="O teu nome" required style={inputStyle}/>
                  </div>
                )}
                <div>
                  <label style={labelStyle}>E-mail</label>
                  <div style={{ position:'relative' }}>
                    <Mail style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)' }} size={16} color="#8892A4"/>
                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@exemplo.com" required style={{ ...inputStyle, paddingLeft:'2.5rem' }}/>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position:'relative' }}>
                    <Lock style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)' }} size={16} color="#8892A4"/>
                    <input type={showPass?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)} placeholder="Mínimo 6 caracteres" required style={{ ...inputStyle, paddingLeft:'2.5rem', paddingRight:'2.5rem' }}/>
                    <button type="button" onClick={()=>setShowPass(v=>!v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#8892A4', display:'flex', padding:0 }}>
                      {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>
                {error && <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:10, padding:'.65rem .9rem', fontSize:'var(--rs-body-sm)', color:'#ef4444' }}>{error}</div>}
                <button type="submit" disabled={loading} style={{ background:'var(--rs-grad-hero)', color:'#fff', border:'none', borderRadius:12, padding:'.82rem', fontSize:'var(--rs-body-md)', fontFamily:'var(--rs-font-body)', fontWeight:700, cursor:loading?'default':'pointer', boxShadow:'var(--rs-shadow-btn)', opacity:loading?.7:1, transition:'opacity .2s', width:'100%' }}>
                  {loading ? 'Aguarda...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              </form>
            </>
          )}

          {/* ── PHONE METHOD — step 1: number ── */}
          {method === 'phone' && !otpSent && (
            <div style={{ display:'flex', flexDirection:'column', gap:'.85rem' }}>
              {mode === 'register' && (
                <div>
                  <label style={labelStyle}>Nome completo</label>
                  <input value={name} onChange={e=>setName(e.target.value)} placeholder="O teu nome" style={inputStyle}/>
                </div>
              )}
              <div>
                <label style={labelStyle}>Número de telefone</label>
                <div style={{ display:'flex', gap:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'.4rem', background:'#0f1729', border:'1.5px solid rgba(255,255,255,.1)', borderRadius:12, padding:'.78rem .9rem', flexShrink:0, color:'rgba(255,255,255,.7)', fontSize:'.95rem', fontWeight:700 }}>
                    🇦🇴 +244
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,9))}
                    placeholder="923 456 789"
                    style={{ ...inputStyle, flex:1, letterSpacing:'.04em' }}
                  />
                </div>
                <div style={{ fontSize:'.72rem', color:'#8892A4', marginTop:'.4rem' }}>Unitel · Africell · Movicel</div>
              </div>
              {error && <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:10, padding:'.65rem .9rem', fontSize:'var(--rs-body-sm)', color:'#ef4444' }}>{error}</div>}
              <button onClick={handleSendOtp} disabled={loading || phone.replace(/\D/g,'').length < 9} style={{ background:'var(--rs-grad-hero)', color:'#fff', border:'none', borderRadius:12, padding:'.82rem', fontSize:'var(--rs-body-md)', fontFamily:'var(--rs-font-body)', fontWeight:700, cursor:(loading||phone.replace(/\D/g,'').length<9)?'default':'pointer', boxShadow:'var(--rs-shadow-btn)', opacity:(loading||phone.replace(/\D/g,'').length<9)?.5:1, transition:'opacity .2s', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:'.5rem' }}>
                {loading ? 'A enviar...' : <><ArrowRight size={16}/> Enviar código SMS</>}
              </button>
            </div>
          )}

          {/* ── PHONE METHOD — step 2: OTP ── */}
          {method === 'phone' && otpSent && (
            <div style={{ display:'flex', flexDirection:'column', gap:'.85rem' }}>
              <div style={{ background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.25)', borderRadius:12, padding:'.85rem 1rem', fontSize:'.88rem', color:'rgba(255,255,255,.8)', lineHeight:1.5 }}>
                Código enviado para <strong>+244 {phone}</strong>.<br/>
                <span style={{ fontSize:'.78rem', color:'#8892A4' }}>Válido por 10 minutos.</span>
              </div>
              <div>
                <label style={labelStyle}>Código SMS (6 dígitos)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                  placeholder="000000"
                  maxLength={6}
                  style={{ ...inputStyle, letterSpacing:'.3em', fontSize:'1.4rem', textAlign:'center' }}
                  autoFocus
                />
              </div>
              {error && <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:10, padding:'.65rem .9rem', fontSize:'var(--rs-body-sm)', color:'#ef4444' }}>{error}</div>}
              <button onClick={handleVerifyOtp} disabled={loading || otp.length < 6} style={{ background:'var(--rs-grad-hero)', color:'#fff', border:'none', borderRadius:12, padding:'.82rem', fontSize:'var(--rs-body-md)', fontFamily:'var(--rs-font-body)', fontWeight:700, cursor:(loading||otp.length<6)?'default':'pointer', boxShadow:'var(--rs-shadow-btn)', opacity:(loading||otp.length<6)?.5:1, transition:'opacity .2s', width:'100%' }}>
                {loading ? 'A verificar...' : 'Confirmar código'}
              </button>
              <button onClick={() => { setOtpSent(false); setOtp(''); setError('') }} style={{ background:'none', border:'none', color:'#8892A4', fontSize:'.88rem', cursor:'pointer', fontFamily:'var(--rs-font-body)', padding:'.4rem' }}>
                ← Reenviar ou alterar número
              </button>
            </div>
          )}

          {/* Toggle mode (email only) */}
          {method === 'email' && !isAdminLogin && (
            <div style={{ textAlign:'center', marginTop:'1.4rem', fontSize:'var(--rs-body-sm)', color:'#8892A4' }}>
              {mode === 'login' ? (
                <>Ainda não tens conta?{' '}<button onClick={()=>{setMode('register');setError('')}} style={{ color:'var(--rs-primary)', fontWeight:700, background:'none', border:'none', cursor:'pointer', padding:0 }}>Registar</button></>
              ) : (
                <>Já tens conta?{' '}<button onClick={()=>{setMode('login');setError('')}} style={{ color:'var(--rs-primary)', fontWeight:700, background:'none', border:'none', cursor:'pointer', padding:0 }}>Entrar</button></>
              )}
            </div>
          )}

          {/* Toggle mode (phone) */}
          {method === 'phone' && !otpSent && !isAdminLogin && (
            <div style={{ textAlign:'center', marginTop:'1.4rem', fontSize:'var(--rs-body-sm)', color:'#8892A4' }}>
              {mode === 'login' ? (
                <>Primeira vez?{' '}<button onClick={()=>{setMode('register');setError('')}} style={{ color:'var(--rs-primary)', fontWeight:700, background:'none', border:'none', cursor:'pointer', padding:0 }}>Criar conta</button></>
              ) : (
                <>Já tens conta?{' '}<button onClick={()=>{setMode('login');setError('')}} style={{ color:'var(--rs-primary)', fontWeight:700, background:'none', border:'none', cursor:'pointer', padding:0 }}>Entrar</button></>
              )}
            </div>
          )}

          {/* Invisible reCAPTCHA anchor for phone auth */}
          <div id="recaptcha-container" />
        </div>
      </div>

      <style>{`
        input { font-family: var(--rs-font-body); }
        input::placeholder { color: #8892A4; }
        input:focus { border-color: var(--rs-primary) !important; outline: none; }
        @keyframes scrollUp   { from { transform: translateY(0); }    to { transform: translateY(-50%); } }
        @keyframes scrollDown { from { transform: translateY(-50%); } to { transform: translateY(0); } }
        @media (max-width: 860px) { .login-left { display: none !important; } .login-mobile-logo { display: block !important; } }
        @media (max-width: 500px) { div[style*="width: 460px"] { width: 100% !important; background: #1A1A2E !important; } }
      `}</style>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#0f1729',
  border: '1.5px solid rgba(255,255,255,.1)',
  color: '#fff',
  padding: '.78rem 1rem',
  borderRadius: 12,
  fontSize: '1rem',
  outline: 'none',
  transition: 'border-color .2s',
  fontFamily: 'var(--rs-font-body)',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '.72rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.6px',
  color: '#8892A4',
  marginBottom: '.4rem',
  fontFamily: 'var(--rs-font-body)',
}
