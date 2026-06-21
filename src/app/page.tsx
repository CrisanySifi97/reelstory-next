'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, Smartphone, Coins, MapPin, WifiOff, Gift, Play, Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react'
import Footer from '@/components/layout/Footer'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

const DEFAULTS = {
  title:      'Histórias que prendem em 90 segundos.',
  subtitle:   'Mais de 500 séries verticais escritas e gravadas em Angola. Romance, suspense, comédia — pagas só os episódios que vês.',
  badge:      'Microdramas verticais · Angola',
  ctaText:    'Começar a assistir',
  gradient:   'linear-gradient(135deg,#1a0533 0%,#2d1b69 40%,#141414 100%)',
  heroImage:  '',           // shown inside the phone screen
  phoneTitle: 'Amor em Segredo',
  phoneEp:    'Ep. 8 · ★ 4.9 · 2,1M visualizações',
  active:     true,
}

export default function LandingPage() {
  const router = useRouter()
  const [banner, setBanner] = useState(DEFAULTS)

  // Redirect authenticated users straight to the app
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) router.replace('/inicio')
    })
    return unsub
  }, [router])

  useEffect(() => {
    getDoc(doc(db,'banners','landing')).then(s => {
      if (s.exists() && s.data().active !== false) {
        const d = s.data()
        setBanner(p=>({
          ...p,
          ...(d.title      && {title:d.title}),
          ...(d.subtitle   && {subtitle:d.subtitle}),
          ...(d.badge      && {badge:d.badge}),
          ...(d.ctaText    && {ctaText:d.ctaText}),
          ...(d.gradient   && {gradient:d.gradient}),
          ...(d.heroImage  && {heroImage:d.heroImage}),
          ...(d.phoneTitle && {phoneTitle:d.phoneTitle}),
          ...(d.phoneEp    && {phoneEp:d.phoneEp}),
        }))
      }
    }).catch(()=>{})
  }, [])

  return (
    <div style={{ margin:0, background:'var(--rs-bg-warm)', color:'#fff', fontFamily:'var(--rs-font-body)', WebkitFontSmoothing:'antialiased', overflowX:'hidden' }}>

      {/* ── NAV ── */}
      <header style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, display:'flex', alignItems:'center', padding:'1.1rem 6%', background:'rgba(14,14,14,.65)', backdropFilter:'blur(24px) saturate(140%)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <span style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.6rem', letterSpacing:'-.01em' }}>
          Reel<span style={{ color:'var(--rs-primary)' }}>Story</span>
        </span>
        <nav style={{ display:'flex', gap:'2rem', marginLeft:'3rem' }} className="land-links">
          <a href="#como-funciona" style={{ color:'rgba(255,255,255,.7)', textDecoration:'none', fontSize:'.92rem', fontWeight:500 }}>Como funciona</a>
          <Link href="/pontos" style={{ color:'rgba(255,255,255,.7)', textDecoration:'none', fontSize:'.92rem', fontWeight:500 }}>Pontos</Link>
        </nav>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'.8rem' }}>
          <Link href="/login" style={{ background:'none', border:'none', color:'rgba(255,255,255,.85)', fontWeight:600, fontSize:'.92rem', cursor:'pointer', padding:'.5rem 0', textDecoration:'none' }}>Entrar</Link>
          <Link href="/login?mode=register" style={{ background:'var(--rs-grad-hero)', border:'none', color:'#fff', padding:'.7rem 1.4rem', borderRadius:50, fontWeight:700, fontSize:'.92rem', cursor:'pointer', boxShadow:'0 8px 22px -8px rgba(255,56,92,.55)', textDecoration:'none', display:'inline-block' }}>Começar grátis</Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ position:'relative', padding:'9rem 6% 5rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3rem', alignItems:'center', minHeight:'90vh', overflow:'hidden' }} className="land-hero">
        {/* Radial glows */}
        <div style={{ position:'absolute', left:'-10%', top:'-20%', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,56,92,.18),transparent 70%)', zIndex:0, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', right:'-15%', bottom:'-25%', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,217,61,.10),transparent 70%)', zIndex:0, pointerEvents:'none' }}/>

        {/* Content */}
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:'.5rem', background:'rgba(255,217,61,.12)', border:'1px solid rgba(255,217,61,.25)', color:'var(--rs-accent)', padding:'.45rem 1rem', borderRadius:50, fontSize:'.76rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'1.4rem' }}>
            <Zap size={14}/><span>{banner.badge}</span>
          </div>
          <h1 style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'clamp(2.8rem,5.6vw,5rem)', lineHeight:.98, letterSpacing:'-.015em', margin:'0 0 1.2rem' }}>
            {banner.title}
          </h1>
          <p style={{ color:'rgba(255,255,255,.7)', fontSize:'1.15rem', lineHeight:1.55, maxWidth:520, margin:'0 0 1.8rem' }}>
            {banner.subtitle}
          </p>
          <div style={{ display:'flex', gap:'.8rem', flexWrap:'wrap', marginBottom:'2rem' }}>
            <Link href="/login?mode=register" style={{ display:'inline-flex', alignItems:'center', gap:'.4rem', background:'var(--rs-grad-hero)', border:'none', color:'#fff', padding:'.95rem 1.9rem', borderRadius:50, fontWeight:700, fontSize:'1rem', cursor:'pointer', boxShadow:'0 8px 22px -8px rgba(255,56,92,.55)', textDecoration:'none' }}>
              <Play size={16} fill="#fff"/> {banner.ctaText}
            </Link>
            <Link href="/explorar" style={{ display:'inline-flex', alignItems:'center', gap:'.4rem', background:'none', border:'1px solid rgba(255,255,255,.2)', color:'rgba(255,255,255,.85)', padding:'.95rem 1.5rem', borderRadius:50, fontWeight:600, fontSize:'.92rem', cursor:'pointer', textDecoration:'none' }}>
              Ver trailer
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display:'flex', gap:'2.5rem', paddingTop:'2rem', borderTop:'1px solid rgba(255,255,255,.06)' }}>
            {[['500+','Séries'],['2M+','Fãs'],['4.9★','Avaliação']].map(([n,l])=>(
              <div key={l} style={{ display:'flex', flexDirection:'column' }}>
                <span style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.8rem', color:'var(--rs-primary)', lineHeight:1 }}>{n}</span>
                <span style={{ fontSize:'.78rem', color:'#8892A4', textTransform:'uppercase', letterSpacing:'.5px', marginTop:'.3rem' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Phone mockup */}
        <div style={{ position:'relative', zIndex:1, display:'flex', justifyContent:'center', alignItems:'center', minHeight:520 }}>
          {/* Back phones */}
          {[
            { style:'translate(-130px, 30px) rotate(-8deg)', grad:'linear-gradient(135deg,#667eea,#764ba2)', title:'O Herdeiro', ep:'EP. 5' },
            { style:'translate(130px, 30px) rotate(8deg)', grad:'linear-gradient(135deg,#a18cd1,#fbc2eb)', title:'CEO Apaixonado', ep:'EP. 3' },
          ].map((p,i)=>(
            <div key={i} style={{ position:'absolute', width:240, aspectRatio:'9/19', borderRadius:42, border:'9px solid #2a2a35', background:'#000', transform:p.style, opacity:.7, filter:'blur(2px)', boxShadow:'0 40px 80px -20px rgba(255,56,92,.35)', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:90, height:24, background:'#000', borderRadius:'0 0 14px 14px', zIndex:5 }}/>
              <div style={{ width:'100%', height:'100%', background:p.grad, padding:'1.6rem 1.2rem', display:'flex', flexDirection:'column', justifyContent:'flex-end', position:'relative' }}>
                <span style={{ position:'absolute', top:'1.6rem', left:'1.2rem', fontSize:'.55rem', fontWeight:800, background:'rgba(255,56,92,.85)', padding:'.18rem .55rem', borderRadius:50, letterSpacing:'.4px', textTransform:'uppercase' }}>{p.ep}</span>
                <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.1rem', lineHeight:1 }}>{p.title}</div>
              </div>
            </div>
          ))}
          {/* Main phone */}
          <div style={{ width:280, aspectRatio:'9/19', borderRadius:42, border:'9px solid #2a2a35', background:'#000', boxShadow:'0 40px 80px -20px rgba(255,56,92,.35), 0 0 0 1px rgba(255,255,255,.04)', overflow:'hidden', position:'relative', zIndex:2 }}>
            <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:90, height:24, background:'#000', borderRadius:'0 0 14px 14px', zIndex:5 }}/>
            <div style={{ width:'100%', height:'100%', background: banner.heroImage ? `url(${banner.heroImage}) center/cover no-repeat` : 'linear-gradient(135deg,#FF385C,#D50032)', padding:'1.6rem 1.2rem', display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative' }}>
              {banner.heroImage && <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.1) 50%, transparent 100%)', pointerEvents:'none' }}/>}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <span style={{ fontSize:'.55rem', fontWeight:800, background:'rgba(255,56,92,.85)', padding:'.18rem .55rem', borderRadius:50, letterSpacing:'.4px', textTransform:'uppercase' }}>EP. 8 / 24</span>
                <span style={{ background:'rgba(0,0,0,.4)', padding:'.18rem .5rem', borderRadius:4, fontSize:'.55rem', fontWeight:700 }}>HD</span>
              </div>
              {/* Rail */}
              <div style={{ position:'absolute', right:'.7rem', bottom:'7rem', display:'flex', flexDirection:'column', gap:'.7rem', alignItems:'center', zIndex:1 }}>
                {([
                  { Ic:Heart,          label:'12K',      primary:true  },
                  { Ic:MessageCircle,  label:'842',      primary:false },
                  { Ic:Bookmark,       label:'Salvar',   primary:false },
                  { Ic:Share2,         label:'Partilhar',primary:false },
                ] as { Ic:React.ElementType; label:string; primary:boolean }[]).map((item,i)=>(
                  <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                    <div style={{ width:34, height:34, borderRadius:'50%', background: item.primary ? 'var(--rs-primary)' : 'rgba(255,255,255,.18)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <item.Ic size={14}/>
                    </div>
                    <span style={{ fontSize:'.5rem', fontWeight:700 }}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ position:'relative', zIndex:1 }}>
                <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.1rem', lineHeight:1, marginBottom:'.3rem', textShadow:'0 1px 4px rgba(0,0,0,.5)' }}>{banner.phoneTitle}</div>
                <div style={{ fontSize:'.6rem', color:'rgba(255,255,255,.85)' }}>{banner.phoneEp}</div>
              </div>
              <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:'rgba(255,255,255,.2)' }}>
                <div style={{ height:'100%', width:'38%', background:'var(--rs-primary)' }}/>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUE PROPS ── */}
      <section style={{ padding:'6rem 6% 5rem' }}>
        <div style={{ fontSize:'.74rem', fontWeight:800, color:'var(--rs-primary)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'.7rem', textAlign:'center' }}>Porquê ReelStory</div>
        <h2 style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'clamp(2rem,4vw,3.2rem)', lineHeight:1.05, textAlign:'center', margin:'0 0 .7rem' }}>Feito para quem vive no telemóvel.</h2>
        <p style={{ color:'#8892A4', textAlign:'center', maxWidth:540, margin:'0 auto 3rem', fontSize:'1.02rem', lineHeight:1.6 }}>Conteúdo vertical, episódios curtos, sem mensalidades. Pagas só o que consomes.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'1.2rem', maxWidth:1100, margin:'0 auto' }}>
          {[
            { Icon:Smartphone, title:'Vertical, sempre', desc:'Filmado em 9:16. Sem girar o telefone, sem cinzas pretas — feito para a tua mão.' },
            { Icon:Coins,      title:'Sem mensalidades', desc:'Compras pontos com Multicaixa, ATM ou cartão. Usa-os quando quiseres. Não expiram.' },
            { Icon:MapPin,     title:'Histórias nossas', desc:'Séries escritas, gravadas e produzidas em Angola. Em português, para o nosso público.' },
            { Icon:Zap,        title:'Episódios de 90s', desc:'Cada episódio é uma viragem. Vês um na fila do banco, três no almoço, dez à noite.' },
            { Icon:WifiOff,    title:'Funciona offline', desc:'Episódios desbloqueados ficam no telemóvel. Vê sem dados, sem rede, sem stress.' },
            { Icon:Gift,       title:'2 episódios grátis', desc:'Em cada série, os 2 primeiros são por nossa conta. Experimenta antes de gastares pontos.' },
          ].map(({ Icon, title, desc }) => (
            <div key={title} style={{ background:'linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.01))', border:'1px solid rgba(255,255,255,.06)', borderRadius:24, padding:'2rem 1.6rem' }}>
              <div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,56,92,.12)', border:'1px solid rgba(255,56,92,.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--rs-primary)', marginBottom:'1.2rem' }}>
                <Icon size={20}/>
              </div>
              <h3 style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.35rem', margin:'0 0 .5rem', letterSpacing:'-.01em' }}>{title}</h3>
              <p style={{ color:'#8892A4', fontSize:'.92rem', lineHeight:1.6, margin:0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" style={{ padding:'5rem 6%', background:'linear-gradient(180deg,transparent,rgba(255,56,92,.04),transparent)' }}>
        <div style={{ fontSize:'.74rem', fontWeight:800, color:'var(--rs-primary)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'.7rem', textAlign:'center' }}>Como funciona</div>
        <h2 style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'clamp(2rem,4vw,3.2rem)', lineHeight:1.05, textAlign:'center', margin:'0 0 .7rem' }}>Quatro passos. Zero complicação.</h2>
        <p style={{ color:'#8892A4', textAlign:'center', maxWidth:540, margin:'0 auto 3rem', fontSize:'1.02rem', lineHeight:1.6 }}>Da primeira abertura ao primeiro episódio em menos de um minuto.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'1.4rem', maxWidth:1100, margin:'0 auto' }}>
          {[
            { n:'1', title:'Cria a conta', desc:'Email, Google ou número de telefone. Sem cartão obrigatório.' },
            { n:'2', title:'Escolhe uma série', desc:'Mais de 500 títulos. Romance, suspense, comédia, terror, acção.' },
            { n:'3', title:'Vê 2 episódios grátis', desc:'Se gostares, compras pontos. Cada episódio custa 10 pts.' },
            { n:'4', title:'Paga em Kwanzas', desc:'Multicaixa Express, Referência ATM ou TPA virtual. Tudo em Kz.' },
          ].map(s => (
            <div key={s.n} style={{ textAlign:'center' }}>
              <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--rs-grad-hero)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.4rem', margin:'0 auto 1rem', boxShadow:'0 8px 22px -8px rgba(255,56,92,.55)' }}>{s.n}</div>
              <h4 style={{ fontWeight:700, fontSize:'1rem', margin:'0 0 .5rem' }}>{s.title}</h4>
              <p style={{ fontSize:'.84rem', color:'#8892A4', lineHeight:1.55, margin:0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING TEASER ── */}
      <section style={{ padding:'5rem 6%', textAlign:'center' }}>
        <div style={{ fontSize:'.74rem', fontWeight:800, color:'var(--rs-primary)', textTransform:'uppercase', letterSpacing:'1.5px', marginBottom:'.7rem' }}>Pacotes de pontos</div>
        <h2 style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'clamp(2rem,4vw,3.2rem)', lineHeight:1.05, margin:'0 0 .7rem' }}>
          A partir de <span style={{ color:'var(--rs-accent)' }}>Kz 1.000</span>.
        </h2>
        <p style={{ color:'#8892A4', maxWidth:540, margin:'0 auto 2rem', fontSize:'1.02rem', lineHeight:1.6 }}>Sem mensalidades. Sem renovação automática. Sem letras pequenas.</p>
        <div style={{ display:'inline-flex', flexWrap:'wrap', alignItems:'center', gap:'1.4rem', background:'linear-gradient(135deg,rgba(255,217,61,.10),rgba(255,56,92,.05))', border:'1px solid rgba(255,217,61,.3)', borderRadius:24, padding:'1.6rem 2rem', maxWidth:760, margin:'0 auto' }}>
          <div style={{ flex:1, minWidth:240, textAlign:'left' }}>
            <div style={{ fontSize:'.72rem', fontWeight:700, color:'var(--rs-accent)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:'.3rem' }}>Mais popular</div>
            <div style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'1.8rem', lineHeight:1.1 }}>550 pts <span style={{ color:'#8892A4', fontSize:'1rem' }}>·</span> Kz 4.500</div>
            <div style={{ color:'#8892A4', fontSize:'.88rem', marginTop:'.3rem' }}>+50 pontos bónus · 11 episódios · poupa 18% vs Básico</div>
          </div>
          <Link href="/pontos" style={{ background:'var(--rs-grad-hero)', border:'none', color:'#fff', padding:'.95rem 1.9rem', borderRadius:50, fontWeight:700, fontSize:'1rem', cursor:'pointer', textDecoration:'none', display:'inline-block', boxShadow:'0 8px 22px -8px rgba(255,56,92,.55)', whiteSpace:'nowrap' }}>
            Ver todos os pacotes
          </Link>
        </div>
      </section>

      <Footer />

      <style>{`
        @media (max-width:900px) {
          .land-hero { grid-template-columns: 1fr !important; padding: 7rem 6% 4rem !important; }
          .land-links { display: none !important; }
          .land-footer { grid-template-columns: 1fr 1fr !important; gap: 2rem !important; }
        }
        a { transition: opacity .2s; }
        a:hover { opacity: .8; }
      `}</style>
    </div>
  )
}
