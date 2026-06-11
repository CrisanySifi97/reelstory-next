'use client'
export default function OfflinePage() {
  return (
    <div style={{ background:'#141414', minHeight:'100dvh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'var(--rs-font-body)', textAlign:'center', padding:'2rem' }}>
      <div style={{ fontSize:'4rem', marginBottom:'1.5rem' }}>📡</div>
      <h1 style={{ fontFamily:'var(--rs-font-display)', fontWeight:900, fontSize:'2rem', marginBottom:'.6rem' }}>
        Reel<span style={{ color:'#FF385C' }}>Story</span>
      </h1>
      <p style={{ color:'rgba(255,255,255,.6)', fontSize:'1rem', lineHeight:1.6, maxWidth:320, marginBottom:'2rem' }}>
        Sem ligação à internet. Verifica a tua rede e tenta de novo.
      </p>
      <button onClick={() => window.location.reload()}
        style={{ background:'linear-gradient(135deg,#FF385C,#D50032)', color:'#fff', border:'none', borderRadius:50, padding:'.85rem 2rem', fontSize:'1rem', fontWeight:700, cursor:'pointer', boxShadow:'0 8px 22px -8px rgba(255,56,92,.55)' }}>
        Tentar novamente
      </button>
      <p style={{ color:'rgba(255,255,255,.3)', fontSize:'.78rem', marginTop:'3rem' }}>
        Os episódios desbloqueados ficam disponíveis offline.
      </p>
    </div>
  )
}
