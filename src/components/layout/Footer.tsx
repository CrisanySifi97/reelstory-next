'use client'
import Link from 'next/link'

function IconFacebook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  )
}
function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
}
function IconYoutube() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#fff"/>
    </svg>
  )
}
function IconTikTok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.86a8.19 8.19 0 0 0 4.78 1.52V7a4.85 4.85 0 0 1-1.01-.31z"/>
    </svg>
  )
}

const SOCIALS = [
  { label: 'Facebook',  Icon: IconFacebook,  href: 'https://www.facebook.com/ReelStoryAngola' },
  { label: 'Instagram', Icon: IconInstagram, href: 'https://www.instagram.com/reelstoryangola/' },
  { label: 'YouTube',   Icon: IconYoutube,   href: 'https://www.youtube.com/@ReelStoryAngola' },
  { label: 'TikTok',    Icon: IconTikTok,    href: 'https://www.tiktok.com/@reelstory46' },
]

export default function Footer() {
  return (
    <footer className="rs-footer" style={{
      background: '#0a0a14',
      borderTop: '1px solid rgba(255,255,255,.06)',
      padding: '3.5rem 6% 2rem',
      color: '#8892A4',
      fontFamily: 'var(--rs-font-body)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Top grid */}
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr', gap: '3rem', marginBottom: '2.5rem' }}>

          {/* Brand */}
          <div>
            <div style={{ marginBottom: '.8rem' }}>
              <span style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#fff' }}>
                Reel<span style={{ color: 'var(--rs-primary)' }}>Story</span>
              </span>
              <span style={{ fontSize: '.52rem', fontWeight: 800, color: 'var(--rs-accent)', background: 'rgba(255,217,61,.10)', border: '1px solid rgba(255,217,61,.25)', padding: '.18rem .4rem', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.8px', marginLeft: 6, verticalAlign: 'middle' }}>AO</span>
            </div>
            <p style={{ fontSize: '.88rem', lineHeight: 1.6, maxWidth: 320, marginBottom: '1.2rem' }}>
              Microdramas verticais para quem vive no telemóvel. Feito em Luanda, para Angola e para o mundo lusófono.
            </p>

            {/* Social icons */}
            <div style={{ display: 'flex', gap: '.6rem' }}>
              {SOCIALS.map(({ label, Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,.06)',
                    border: '1px solid rgba(255,255,255,.1)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: '#8892A4',
                    transition: 'background .2s, color .2s, border-color .2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,56,92,.15)'
                    e.currentTarget.style.color = 'var(--rs-primary)'
                    e.currentTarget.style.borderColor = 'rgba(255,56,92,.35)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,.06)'
                    e.currentTarget.style.color = '#8892A4'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'
                  }}
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <div style={{ fontSize: '.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#fff', marginBottom: '1rem' }}>
              Empresa
            </div>
            {[
              { label: 'Sobre Nós',              href: '/sobre' },
              { label: 'Termos de Uso',           href: '/termos' },
              { label: 'Política de Privacidade', href: '/privacidade' },
            ].map(l => (
              <div key={l.label} style={{ marginBottom: '.6rem' }}>
                <Link href={l.href} style={{ fontSize: '.88rem', color: '#8892A4', textDecoration: 'none', transition: 'color .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#8892A4')}
                >
                  {l.label}
                </Link>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontSize: '.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#fff', marginBottom: '1rem' }}>
              Fale Connosco
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <a href="mailto:contacto@reelstory.co.ao" style={{ display: 'flex', alignItems: 'center', gap: '.55rem', fontSize: '.86rem', color: '#8892A4', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8892A4')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                contacto@reelstory.co.ao
              </a>
              <a href="https://wa.me/244976020849" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '.55rem', fontSize: '.86rem', color: '#8892A4', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#25D366')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8892A4')}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                +244 976 020 849
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', fontSize: '.78rem' }}>
          <span>© {new Date().getFullYear()} ReelStory · Todos os direitos reservados</span>
          <div style={{ display: 'flex', gap: '1.2rem' }}>
            <Link href="/termos" style={{ color: '#8892A4', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#8892A4')}
            >Termos</Link>
            <Link href="/privacidade" style={{ color: '#8892A4', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = '#8892A4')}
            >Privacidade</Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .rs-footer { display: none !important; }
        }
      `}</style>
    </footer>
  )
}
