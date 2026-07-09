import { NextRequest, NextResponse } from 'next/server'
import admin from '@/lib/firebaseAdmin'
import { getFirestore } from 'firebase-admin/firestore'

// Serves the real video URL for one episode. Free episodes' URLs already sit
// on the public "dramas" doc, but paid episodes' URLs live only in the
// admin-only "episodeUrls" collection — this route is the one place that's
// allowed to read them, and only after confirming the caller actually
// unlocked this specific episode (or it's free).
export async function GET(req: NextRequest) {
  if (!admin.apps.length) {
    return NextResponse.json({ error: 'Firebase Admin não configurado' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const dramaId = searchParams.get('dramaId') ?? ''
  const epId    = Number(searchParams.get('epId'))
  if (!dramaId || !Number.isFinite(epId)) {
    return NextResponse.json({ error: 'dramaId/epId inválido' }, { status: 400 })
  }

  const db = getFirestore()
  const dramaSnap = await db.collection('dramas').doc(dramaId).get()
  if (!dramaSnap.exists) {
    return NextResponse.json({ error: 'série não encontrada' }, { status: 404 })
  }

  const episodes = dramaSnap.data()?.episodes ?? []
  const epIndex  = episodes.findIndex((e: { id: number }) => e.id === epId)
  const episode  = episodes[epIndex]
  if (!episode) {
    return NextResponse.json({ error: 'episódio não encontrado' }, { status: 404 })
  }

  const key = `${dramaId}_${epId}`
  // Matches the player's own rule: the first episode in the array is always
  // watchable regardless of its "free" flag (legacy fallback).
  const isFree = episode.free || epIndex === 0

  if (!isFree) {
    const authHeader = req.headers.get('authorization') ?? ''
    const match = authHeader.match(/^Bearer (.+)$/)
    if (!match) return NextResponse.json({ error: 'não autenticado' }, { status: 401 })

    let uid: string
    try {
      uid = (await admin.auth().verifyIdToken(match[1])).uid
    } catch {
      return NextResponse.json({ error: 'token inválido' }, { status: 401 })
    }

    const userSnap = await db.collection('users').doc(uid).get()
    const unlocked: string[] = userSnap.data()?.unlockedEpisodes ?? []
    if (!unlocked.includes(key)) {
      return NextResponse.json({ error: 'episódio não desbloqueado' }, { status: 403 })
    }
  }

  const urlSnap = await db.collection('episodeUrls').doc(key).get()
  if (urlSnap.exists) {
    const { url, hlsUrl } = urlSnap.data() as { url?: string; hlsUrl?: string }
    return NextResponse.json({ url, hlsUrl })
  }

  // Free episodes (or ones never migrated to episodeUrls) still carry the URL inline.
  if (episode.url) return NextResponse.json({ url: episode.url, hlsUrl: episode.hlsUrl })

  return NextResponse.json({ error: 'vídeo indisponível' }, { status: 404 })
}
