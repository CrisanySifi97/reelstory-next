import { redirect } from 'next/navigation'

// Compatibilidade com links antigos no formato /detalhe?id=X (partilhados antes
// desta página passar a ser /detalhe/[id], que permite título/imagem próprios
// ao partilhar). Sem id, manda para o catálogo.
export default async function DetalheRedirect({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams
  redirect(id ? `/detalhe/${id}` : '/explorar')
}
