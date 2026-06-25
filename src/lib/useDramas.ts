'use client'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { DRAMAS as MOCK_DRAMAS } from '@/lib/mock'
import type { Drama } from '@/types'

// Normalize a Firestore doc into a Drama with correct id
function fromFirestore(id: string, data: Record<string, any>): Drama {
  return {
    id,
    title:       data.title       ?? '',
    genre:       data.genre       ?? 'romance',
    description: data.description ?? '',
    short:       data.short       ?? '',
    status:      data.status      ?? 'Ativo',
    rating:      data.rating      ?? 0,
    views:       data.views       ?? 0,
    // Sort by "order" — the array's storage order doesn't always match it (e.g. an
    // episode added later in the admin can have a lower "order" than earlier ones),
    // but both the episode grid and the feed player index into this array directly.
    episodes:    [...(data.episodes ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    posterGrad:  data.posterGrad  ?? 'var(--rs-poster-romance)',
    posterImage:  data.posterImage  ?? undefined,
    bannerImage:  data.bannerImage  ?? undefined,
    badge:       data.badge       ?? undefined,
    cast:        data.cast        ?? [],
    year:        data.year        ?? new Date().getFullYear(),
    icon:        data.icon        ?? '🎬',
  } as Drama & { icon: string; short: string }
}

// Cache the active-dramas list for the session — avoids re-fetching from
// Firestore on every page navigation (inicio, explorar, lista, detalhe all use it).
let cachedDramas: (Drama & { icon: string })[] | null = null

/* ── Load all active dramas ── */
export function useDramas() {
  const [dramas, setDramas]     = useState<(Drama & { icon:string })[]>(cachedDramas ?? [])
  const [loading, setLoading]   = useState(!cachedDramas)
  const [isLive, setIsLive]     = useState(!!cachedDramas)  // true = data came from Firestore
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    if (cachedDramas) return

    getDocs(query(
      collection(db, 'dramas'),
      where('status', '==', 'Ativo'),
    ))
      .then(snap => {
        if (!snap.empty) {
          const list = snap.docs
            .map(d => fromFirestore(d.id, d.data()) as Drama & { icon:string })
            .sort((a, b) => a.title.localeCompare(b.title))
          cachedDramas = list
          setDramas(list)
          setIsLive(true)
        }
        // else keep mock data
      })
      .catch(err => {
        // On error, fall back to mock data so the page isn't empty, but flag it —
        // a real Firestore outage shouldn't silently look like a normal catalog.
        console.error('[useDramas] erro ao carregar séries, a usar dados de exemplo', err)
        setError('Não foi possível carregar as séries — a mostrar conteúdo de exemplo')
        setDramas(MOCK_DRAMAS as unknown as (Drama & { icon: string })[])
      })
      .finally(() => setLoading(false))
  }, [])

  return { dramas, loading, isLive, error }
}

/* ── Load a single drama by ID ── */
export function useDrama(id: string) {
  const [drama, setDrama]     = useState<(Drama & { icon:string }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    getDoc(doc(db, 'dramas', id))
      .then(snap => {
        if (snap.exists()) {
          setDrama(fromFirestore(snap.id, snap.data()) as Drama & { icon:string })
        }
        // else keep mock or null
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  return { drama, loading }
}
