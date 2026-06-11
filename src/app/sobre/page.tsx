import Link from 'next/link'
import Footer from '@/components/layout/Footer'

export const metadata = {
  title: 'Sobre Nós · ReelStory',
  description: 'Somos angolanos viciados em doramas — e criámos a nossa própria plataforma.',
}

const TESTIMONIALS = [
  { text: 'Mano… eu comecei a ver um episódio às 11h da noite e só parei às 3h da manhã! Viciante pra caramba 😂', name: 'Kelvin', age: 24 },
  { text: 'Finalmente um app com doramas na nossa língua! As histórias são boas mesmo, parece novela mas em versão rápida.', name: 'Vanessa', age: 21 },
  { text: 'O CEO Apaixonado é o melhor! Já gastei pontos no Mega e não me arrependo nadinha. Recomendo 100%', name: 'Miguel', age: 28 },
  { text: 'As histórias são bem feitas e os atores parecem gente da nossa terra. Estou apaixonada!', name: 'Aisha', age: 19 },
]

const PERKS = [
  { emoji: '🔥', text: 'Doramas feitos por angolanos pra angolanos' },
  { emoji: '📱', text: 'Formato vertical (perfeito pro celular)' },
  { emoji: '🚀', text: 'Episódios novos toda semana' },
  { emoji: '💰', text: 'Pagamento único — o que compras é teu pra sempre' },
  { emoji: '❤️', text: 'Sem encheção de saco no meio do vídeo' },
]

export default function SobrePage() {
  return (
    <div style={{ background: 'var(--rs-bg-warm)', minHeight: '100dvh', fontFamily: 'var(--rs-font-body)', color: '#fff', overflowX: 'hidden' }}>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', padding: '5rem 6% 4rem', textAlign: 'center', overflow: 'hidden' }}>
        {/* Glows */}
        <div style={{ position: 'absolute', left: '50%', top: '-10%', width: 600, height: 600, transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,56,92,.18), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.84rem', color: '#8892A4', textDecoration: 'none', marginBottom: '2rem' }}>
            ← Voltar
          </Link>

          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👋</div>

          <h1 style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: 'clamp(2.4rem,5vw,4rem)', lineHeight: 1.02, letterSpacing: '-.018em', marginBottom: '1.2rem' }}>
            E aí, <span style={{ color: 'var(--rs-primary)' }}>família!</span>
          </h1>

          <p style={{ fontSize: 'clamp(1rem,2vw,1.2rem)', color: 'rgba(255,255,255,.8)', lineHeight: 1.6, maxWidth: 580, margin: '0 auto 1.5rem' }}>
            Bem-vindo à <strong style={{ color: '#fff' }}>ReelStory</strong> — o lugar onde os doramas em português realmente viciam!
          </p>

          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,.65)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
            Nós criamos micro-dramas curtos, intensos e cheios de drama, romance, traição e aquele calorzinho no coração.
            Tudo feito aqui em Angola, com a nossa cara, o nosso sotaque e as nossas histórias.
          </p>
        </div>
      </div>

      {/* ── Como tudo começou ── */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '1rem 6% 4rem' }}>
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 24, padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: 'var(--rs-grad-hero)' }} />
          <h2 style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.6rem', marginBottom: '1.1rem' }}>
            Como tudo começou
          </h2>
          <p style={{ color: 'rgba(255,255,255,.75)', lineHeight: 1.75, marginBottom: '1.2rem', fontSize: '.98rem' }}>
            Éramos um grupo de amigos viciados em doramas coreanos, turcos e nigerianos… mas cansados de ler legendas o tempo todo. Daí surgiu a ideia:
          </p>
          <div style={{ background: 'rgba(255,56,92,.08)', border: '1px solid rgba(255,56,92,.25)', borderRadius: 16, padding: '1.2rem 1.6rem', margin: '1.2rem 0' }}>
            <p style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.15rem', color: 'var(--rs-primary)', margin: 0, fontStyle: 'italic' }}>
              "Por que não fazemos os nossos próprios doramas?"
            </p>
          </div>
          <p style={{ color: 'rgba(255,255,255,.75)', lineHeight: 1.75, fontSize: '.98rem' }}>
            E foi isso que fizemos. Histórias rápidas (1 a 3 minutos), perfeitas para ver no bus, no intervalo do trabalho ou deitado na cama à noite.
          </p>
        </div>
      </div>

      {/* ── O que é a ReelStory ── */}
      <div style={{ background: 'linear-gradient(180deg, transparent, rgba(255,56,92,.05), transparent)', padding: '3rem 6%', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', marginBottom: '1rem' }}>
            O que é a <span style={{ color: 'var(--rs-primary)' }}>ReelStory?</span>
          </h2>
          <p style={{ fontSize: '1.15rem', color: 'rgba(255,255,255,.8)', lineHeight: 1.65, marginBottom: '1.2rem' }}>
            É a plataforma onde tu maratonas <em style={{ color: 'var(--rs-accent)' }}>sem culpa.</em>
          </p>
          <p style={{ fontSize: '.98rem', color: 'rgba(255,255,255,.6)', lineHeight: 1.75 }}>
            Sem esperar uma semana pelo próximo episódio. Sem propaganda chata no meio. Só tu, teu celular e muita emoção.
          </p>
        </div>
      </div>

      {/* ── Testemunhos ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 6%' }}>
        <h2 style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: 'clamp(1.6rem,3vw,2.2rem)', textAlign: 'center', marginBottom: '2.5rem' }}>
          O que o pessoal está a dizer 💬
        </h2>

        <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.2rem' }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: '1.6rem 1.8rem', position: 'relative' }}>
              {/* Quote mark */}
              <div style={{ position: 'absolute', top: '1rem', right: '1.2rem', fontFamily: 'Georgia, serif', fontSize: '3.5rem', lineHeight: 1, color: 'rgba(255,56,92,.2)', userSelect: 'none' }}>"</div>

              <p style={{ fontSize: '.94rem', color: 'rgba(255,255,255,.82)', lineHeight: 1.65, marginBottom: '1.1rem', fontStyle: 'italic', position: 'relative' }}>
                "{t.text}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--rs-grad-hero)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '.88rem', flexShrink: 0 }}>
                  {t.name[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{t.name}</div>
                  <div style={{ fontSize: '.76rem', color: '#8892A4' }}>{t.age} anos</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Porque a malta curte ── */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 6% 3rem' }}>
        <h2 style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: 'clamp(1.6rem,3vw,2.2rem)', textAlign: 'center', marginBottom: '2rem' }}>
          Porque a malta curte a ReelStory
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
          {PERKS.map(p => (
            <div key={p.emoji} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '1rem 1.4rem' }}>
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{p.emoji}</span>
              <span style={{ fontSize: '.98rem', color: 'rgba(255,255,255,.85)' }}>{p.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Resumo final ── */}
      <div style={{ textAlign: 'center', padding: '2rem 6% 5rem' }}>
        <div style={{ maxWidth: 620, margin: '0 auto', background: 'linear-gradient(135deg, rgba(255,56,92,.12), rgba(255,217,61,.06))', border: '1px solid rgba(255,56,92,.2)', borderRadius: 24, padding: '2.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎬</div>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,.85)', lineHeight: 1.75 }}>
            Criámos a ReelStory pra quem ama sentir <strong style={{ color: 'var(--rs-primary)' }}>borboletas na barriga</strong>, raiva, ciúmes e vontade de dar um soco no vilão…
            tudo isso em doses curtas e viciantes.
          </p>
          <div style={{ marginTop: '1.8rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/explorar" style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: 'var(--rs-grad-hero)', color: '#fff', padding: '.8rem 1.8rem', borderRadius: 50, fontWeight: 700, fontSize: '.95rem', textDecoration: 'none', boxShadow: '0 8px 22px -8px rgba(255,56,92,.55)' }}>
              Ver as séries
            </Link>
            <Link href="/pontos" style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', padding: '.8rem 1.8rem', borderRadius: 50, fontWeight: 700, fontSize: '.95rem', textDecoration: 'none' }}>
              Ver pacotes
            </Link>
          </div>
        </div>
      </div>

      <Footer />

      <style>{`
        @media (max-width: 640px) {
          .testimonials-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
