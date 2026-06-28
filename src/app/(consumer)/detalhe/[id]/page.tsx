import type { Metadata } from 'next'
import admin from '@/lib/firebaseAdmin'
import DetalheClient from './DetalheClient'

const APP_URL = 'https://reelstory-next.vercel.app'

async function getDrama(id: string) {
  const snap = await admin.firestore().collection('dramas').doc(id).get()
  return snap.exists ? snap.data() : null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const drama = await getDrama(id)
  if (!drama) return { title: 'ReelStory — Microdramas verticais · Angola' }

  const title       = `${drama.title} — ReelStory`
  const description = drama.short || (drama.description as string)?.slice(0, 160) || ''
  const image        = drama.posterImage || drama.bannerImage

  return {
    title,
    description,
    openGraph: {
      type: 'video.other',
      url: `${APP_URL}/detalhe/${id}`,
      title: drama.title,
      description,
      siteName: 'ReelStory',
      images: image ? [{ url: image, width: 1200, height: 1800, alt: drama.title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: drama.title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function DetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <DetalheClient id={id} />
}
