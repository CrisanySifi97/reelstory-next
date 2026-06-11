import Link from 'next/link'
import Footer from '@/components/layout/Footer'

export const metadata = { title: 'Termos de Uso · ReelStory', description: 'Termos e condições de utilização da plataforma ReelStory.' }

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section style={{ marginBottom: '2.5rem' }}>
    <h2 style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: '1.25rem', color: '#fff', marginBottom: '.9rem', paddingBottom: '.6rem', borderBottom: '1px solid rgba(255,255,255,.07)' }}>{title}</h2>
    <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '.95rem', lineHeight: 1.75 }}>{children}</div>
  </section>
)

const P = ({ children }: { children: React.ReactNode }) => <p style={{ marginBottom: '.75rem' }}>{children}</p>

export default function TermosPage() {
  return (
    <div style={{ background: 'var(--rs-bg-warm)', minHeight: '100dvh', fontFamily: 'var(--rs-font-body)', color: '#fff' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg,rgba(255,56,92,.08) 0%,transparent 100%)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '3rem 6% 2.5rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.84rem', color: '#8892A4', textDecoration: 'none', marginBottom: '1.5rem' }}>
            ← Voltar
          </Link>
          <h1 style={{ fontFamily: 'var(--rs-font-display)', fontWeight: 900, fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 1.05, marginBottom: '.6rem' }}>
            Termos de Uso
          </h1>
          <p style={{ color: '#8892A4', fontSize: '.9rem' }}>Última actualização: Janeiro de 2026 · ReelStory, Lda. · Luanda, Angola</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 6% 4rem' }}>

        <Section title="1. Aceitação dos Termos">
          <P>Ao aceder ou utilizar a plataforma ReelStory (disponível em reelstory-next.vercel.app e na aplicação móvel), o utilizador declara ter lido, compreendido e aceite integralmente os presentes Termos de Uso.</P>
          <P>Se não concordar com alguma das disposições aqui previstas, deverá cessar imediatamente a utilização dos nossos serviços.</P>
        </Section>

        <Section title="2. Descrição do Serviço">
          <P>A ReelStory é uma plataforma de streaming de microdramas verticais, produzidos em Angola e em língua portuguesa. O serviço disponibiliza conteúdos audiovisuais em formato episódico, acessíveis mediante um sistema de pontos adquiridos pelo utilizador.</P>
          <P>Cada série disponibiliza os dois primeiros episódios gratuitamente. Os episódios seguintes requerem o desbloqueio através de pontos, ao custo de 50 pontos por episódio.</P>
        </Section>

        <Section title="3. Registo e Conta">
          <P>Para aceder à totalidade dos serviços, o utilizador deve criar uma conta pessoal, fornecendo informações verdadeiras, actuais e completas. O utilizador é responsável pela confidencialidade da sua senha e por todas as actividades realizadas na sua conta.</P>
          <P>É proibida a criação de contas falsas, o uso de identidades de terceiros ou a partilha de credenciais de acesso. A ReelStory reserva-se o direito de suspender ou encerrar contas que violem estas disposições.</P>
        </Section>

        <Section title="4. Sistema de Pontos e Pagamentos">
          <P>Os pontos são adquiridos através de pacotes pagos em Kwanzas (Kz), processados pela plataforma de pagamento Kursinha. Os pacotes disponíveis, os respectivos valores e bónus são apresentados na página de pontos e podem ser actualizados sem aviso prévio.</P>
          <P>Os pontos não têm prazo de validade e não são reembolsáveis, salvo disposição legal em contrário. Não é possível transferir pontos entre contas. Em caso de falha técnica no crédito de pontos após pagamento confirmado, o utilizador deve contactar o suporte.</P>
        </Section>

        <Section title="5. Propriedade Intelectual">
          <P>Todo o conteúdo disponível na ReelStory — incluindo, mas não se limitando a, vídeos, textos, imagens, marcas e logótipos — é propriedade da ReelStory ou dos seus licenciantes e está protegido pelas leis angolanas e internacionais de propriedade intelectual.</P>
          <P>É expressamente proibido reproduzir, distribuir, modificar, transmitir ou utilizar qualquer conteúdo da plataforma para fins comerciais sem autorização prévia e escrita da ReelStory.</P>
        </Section>

        <Section title="6. Condutas Proibidas">
          <P>O utilizador compromete-se a não utilizar a plataforma para:</P>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '.75rem' }}>
            {[
              'Violar direitos de terceiros ou legislação aplicável;',
              'Tentar aceder a conteúdos sem o devido desbloqueio;',
              'Utilizar sistemas automatizados (bots) para aceder ao serviço;',
              'Publicar comentários ofensivos, discriminatórios ou ilegais;',
              'Comprometer a segurança ou integridade da plataforma.',
            ].map(i => <li key={i}>{i}</li>)}
          </ul>
        </Section>

        <Section title="7. Limitação de Responsabilidade">
          <P>A ReelStory não garante que o serviço estará disponível de forma ininterrupta ou isento de erros. Em caso de interrupção de serviço, a empresa envidará os melhores esforços para repor o funcionamento normal no menor tempo possível.</P>
          <P>A ReelStory não se responsabiliza por danos indirectos, lucros cessantes ou perdas de dados resultantes da utilização ou impossibilidade de utilização do serviço.</P>
        </Section>

        <Section title="8. Alterações aos Termos">
          <P>A ReelStory reserva-se o direito de modificar os presentes Termos a qualquer momento. As alterações serão comunicadas por e-mail ou mediante aviso na plataforma. A continuação da utilização do serviço após a notificação constitui aceitação dos novos termos.</P>
        </Section>

        <Section title="9. Lei Aplicável e Foro">
          <P>Os presentes Termos são regidos pela legislação angolana. Quaisquer litígios decorrentes da sua interpretação ou execução serão submetidos aos tribunais competentes da cidade de Luanda, Angola.</P>
        </Section>

        <Section title="10. Contacto">
          <P>Para questões relacionadas com estes Termos, contacte-nos através de:</P>
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
