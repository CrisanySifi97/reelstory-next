'use client'
import { useState, useEffect, useCallback } from 'react'
import { auth, db } from '@/lib/firebase'
import {
  doc, getDoc, setDoc,
  serverTimestamp, runTransaction,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export interface RatingSummary {
  avg: number
  count: number
  dist: Record<number, number>
}

export function useRating(dramaId: string) {
  const [uid, setUid]               = useState<string | null>(null)
  const [userRating, setUserRating] = useState(0)
  const [summary, setSummary]       = useState<RatingSummary>({ avg:0, count:0, dist:{1:0,2:0,3:0,4:0,5:0} })
  const [submitting, setSubmitting] = useState(false)
  const [rateError, setRateError]   = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { setUid(null); return }
      setUid(user.uid)
      try {
        const snap = await getDoc(doc(db, 'ratings', `${dramaId}_${user.uid}`))
        if (snap.exists()) setUserRating(snap.data().rating ?? 0)
      } catch {}
    })
    return unsub
  }, [dramaId])

  useEffect(() => {
    getDoc(doc(db, 'dramas', dramaId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        const rawDist = d.ratingDist ?? {}
        setSummary({
          avg: d.rating ?? 0,
          count: d.ratingCount ?? 0,
          dist: { 1: rawDist[1] ?? 0, 2: rawDist[2] ?? 0, 3: rawDist[3] ?? 0, 4: rawDist[4] ?? 0, 5: rawDist[5] ?? 0 },
        })
      }
    }).catch(() => {})
  }, [dramaId])

  const rate = useCallback(async (rating: number): Promise<boolean> => {
    if (!uid) return false
    setSubmitting(true)
    setRateError('')
    try {
      const key       = `${dramaId}_${uid}`
      const ratingRef = doc(db, 'ratings', key)
      const dramaRef  = doc(db, 'dramas', dramaId)

      // Transacção em vez de optimistic update a partir de estado local — lê o
      // ratingCount/rating reais do servidor, evitando perder votos quando dois
      // utilizadores avaliam a mesma série quase ao mesmo tempo.
      const result = await runTransaction(db, async tx => {
        const [ratingSnap, dramaSnap] = await Promise.all([tx.get(ratingRef), tx.get(dramaRef)])
        const prevRating   = ratingSnap.exists() ? (ratingSnap.data().rating ?? 0) : 0
        const isNew        = prevRating === 0
        const dramaData    = dramaSnap.data() ?? {}
        const currentAvg   = dramaData.rating ?? 0
        const currentCount = dramaData.ratingCount ?? 0
        const newCount     = isNew ? currentCount + 1 : currentCount
        const newTotal     = currentAvg * currentCount - (isNew ? 0 : prevRating) + rating
        const avg          = newCount > 0 ? Math.round((newTotal / newCount) * 10) / 10 : rating

        // Per-star breakdown, persisted so every visitor sees the real
        // distribution — previously only tracked in local state, so it reset
        // to all-zero on every fresh page load regardless of ratingCount.
        const rawDist  = dramaData.ratingDist ?? {}
        const newDist: Record<number, number> = { 1: rawDist[1] ?? 0, 2: rawDist[2] ?? 0, 3: rawDist[3] ?? 0, 4: rawDist[4] ?? 0, 5: rawDist[5] ?? 0 }
        if (!isNew && prevRating > 0) newDist[prevRating] = Math.max(0, newDist[prevRating] - 1)
        newDist[rating] = (newDist[rating] ?? 0) + 1

        tx.set(ratingRef, { dramaId, userId: uid, rating, updatedAt: serverTimestamp() }, { merge: true })
        tx.update(dramaRef, { rating: avg, ratingCount: newCount, ratingDist: newDist })
        return { avg, newCount, newDist }
      })

      setUserRating(rating)
      setSummary({ avg: result.avg, count: result.newCount, dist: result.newDist })

      return true
    } catch (e: any) {
      const code: string = e?.code ?? e?.message ?? String(e)
      console.error('[useRating]', code, e)
      setRateError(code)
      return false
    } finally {
      setSubmitting(false)
    }
  }, [uid, dramaId])

  return { uid, userRating, summary, rate, submitting, rateError }
}
