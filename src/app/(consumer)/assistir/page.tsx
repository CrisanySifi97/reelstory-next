import { redirect } from 'next/navigation'

// Redirects legacy /assistir?id=X links to the new /feed player
export default function AssistirPage({
  searchParams,
}: {
  searchParams: { id?: string; ep?: string }
}) {
  const id = searchParams.id ?? '1'
  const ep = searchParams.ep ?? '0'
  redirect(`/feed?id=${id}&ep=${ep}`)
}
