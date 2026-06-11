import Link from 'next/link'
import Footer from '@/components/layout/Footer'

export const metadata = { title: 'Política de Privacidade · ReelStory', description: 'Como a ReelStory recolhe, utiliza e protege os teus dados pessoais.' }

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: '2.5rem' }}>
    <h2 style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.25rem', color: '#fff', marginBottom: '.9rem', paddingBottom: '.6rem', borderBottom: '1px solid rgba(255,255,255,.07)' }}>{title}</h2>
    <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '.95rem', lineHeight: 1.75 }}>{children}</div>
  </section>
)

const P = ({ children }: { children: React.ReactNode }) => <p style={{ marginBottom: '.75rem' }}>{children}</p>

export default function PrivacidadePage() {
  return (
    <div style={{ background: 'var(--rs-bg-warm)', minHeight: '100dvh', fontFamily: 'var(--rs-font-body)', color: '#fff' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg,rgba(255,56,92,.08) 0%,transparent 100%)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '3rem 6% 2.5rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.84rem', color: '#8892A4', textDecoration: 'none', marginBottom: '1.5rem' }}>
            ← Voltar
          </Link>
          <h1 style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 1.05, marginBottom: '.6rem' }}>
            Política de Privacidade
          </h1>
          <p style={{ color: '#8892A4', fontSize: '.9rem' }}>Última actualização: Janeiro de 2026 · ReelStory, Lda. · Luanda, Angola</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 6% 4rem' }}>

        <Section title="1. Responsável pelo Tratamento">
          <P>A ReelStory, Lda., com sede em Luanda, Angola, é a entidade responsável pelo tratamento dos dados pessoais recolhidos através da plataforma ReelStory.</P>
          <P>Para exercer os seus direitos ou esclarecer dúvidas sobre privacidade, contacte-nos em <a href="mailto:contacto@reelstory.co.ao" style={{ color: 'var(--rs-primary)', textDecoration: 'none' }}>contacto@reelstory.co.ao</a>.</P>
        </Section>

        <Section title="2. Dados que Recolhemos">
          <P>Recolhemos apenas os dados necessários para a prestação do serviço:</P>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '.75rem' }}>
            {[
              'Dados de identificação: nome, endereço de e-mail;',
              'Dados de autenticação: senha (armazenada de forma cifrada);',
              'Dados de utilização: episódios desbloqueados, lista pessoal, avaliações e comentários;',
              'Dados de pagamento: histórico de compras de pontos (não armazenamos dados de cartão bancário);',
              'Dados técnicos: endereço IP, tipo de dispositivo, sistema operativo e token de notificações push (com consentimento).',
            ].map(i => <li key={i}>{i}</li>)}
          </ul>
        </Section>

        <Section title="3. Finalidades do Tratamento">
          <P>Os seus dados são utilizados exclusivamente para:</P>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '.75rem' }}>
            {[
              'Criar e gerir a sua conta de utilizador;',
              'Processar compras de pontos e creditar os episódios desbloqueados;',
              'Enviar notificações push de novos conteúdos (apenas com o seu consentimento);',
              'Melhorar a experiência na plataforma e desenvolver novos conteúdos;',
              'Cumprir obrigações legais.',
            ].map(i => <li key={i}>{i}</li>)}
          </ul>
          <P>Não vendemos, cedemos nem partilhamos os seus dados com terceiros para fins comerciais.</P>
        </Section>

        <Section title="4. Base Legal para o Tratamento">
          <P>O tratamento dos seus dados assenta nas seguintes bases legais:</P>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '.75rem' }}>
            {[
              'Execução do contrato — necessário para prestar o serviço ao qual aderiu;',
              'Consentimento — para envio de notificações push e comunicações de marketing;',
              'Interesse legítimo — para melhorar a plataforma e prevenir fraudes.',
            ].map(i => <li key={i}>{i}</li>)}
          </ul>
        </Section>

        <Section title="5. Retenção dos Dados">
          <P>Os seus dados são conservados enquanto a conta estiver activa. Após o encerramento da conta, os dados serão eliminados num prazo de 90 dias, excepto quando a conservação for exigida por lei.</P>
        </Section>

        <Section title="6. Partilha com Terceiros">
          <P>Para a prestação do serviço, recorremos a parceiros tecnológicos de confiança, nomeadamente:</P>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '.75rem' }}>
            {[
              'Firebase (Google) — autenticação e base de dados;',
              'Cloudinary — armazenamento de imagens;',
              'Kursinha — processamento de pagamentos;',
              'Vercel — alojamento da plataforma.',
            ].map(i => <li key={i}>{i}</li>)}
          </ul>
          <P>Estes parceiros apenas têm acesso aos dados estritamente necessários para as suas funções e estão obrigados a respeitar a confidencialidade dos dados.</P>
        </Section>

        <Section title="7. Segurança">
          <P>Implementamos medidas técnicas e organizacionais para proteger os seus dados contra acesso não autorizado, perda ou destruição, incluindo encriptação de senhas, comunicações via HTTPS e acesso restrito à base de dados.</P>
        </Section>

        <Section title="8. Os Seus Direitos">
          <P>Tem direito a:</P>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '.75rem' }}>
            {[
              'Aceder aos seus dados pessoais;',
              'Rectificar dados incorrectos ou incompletos;',
              'Solicitar a eliminação dos seus dados;',
              'Opor-se ao tratamento para fins de marketing;',
              'Revogar o consentimento para notificações push.',
            ].map(i => <li key={i}>{i}</li>)}
          </ul>
          <P>Para exercer estes direitos, envie um pedido para <a href="mailto:contacto@reelstory.co.ao" style={{ color: 'var(--rs-primary)', textDecoration: 'none' }}>contacto@reelstory.co.ao</a>. Responderemos no prazo de 15 dias úteis.</P>
        </Section>

        <Section title="9. Cookies e Tecnologias Similares">
          <P>A plataforma utiliza armazenamento local (localStorage e sessionStorage) para guardar preferências do utilizador e garantir o funcionamento da aplicação progressiva (PWA). Não utilizamos cookies de rastreamento de terceiros para fins publicitários.</P>
        </Section>

        <Section title="10. Alterações a esta Política">
          <P>Podemos actualizar esta Política de Privacidade periodicamente. Notificaremos os utilizadores de alterações significativas por e-mail ou através de aviso na plataforma.</P>
        </Section>

        <Section title="11. Contacto">
          <P>Para questões sobre privacidade ou para exercer os seus direitos:</P>
          <P>
            <a href="mailto:contacto@reelstory.co.ao" style={{ color: 'var(--rs-primary)', textDecoration: 'none' }}>contacto@reelstory.co.ao</a>
            {' '}· WhatsApp: <a href="https://wa.me/244976020849" style={{ color: '#25D366', textDecoration: 'none' }}>+244 976 020 849</a>
          </P>
        </Section>

      </div>

      <Footer />
    </div>
  )
}
