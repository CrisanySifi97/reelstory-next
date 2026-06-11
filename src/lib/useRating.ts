'use client'
import { useState, useEffect, useCallback } from 'react'
import { auth, db } from '@/lib/firebase'
import {
  doc, getDoc, setDoc,
  serverTimestamp, updateDoc,
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
        setSummary(s => ({ ...s, avg: d.rating ?? 0, count: d.ratingCount ?? 0 }))
      }
    }).catch(() => {})
  }, [dramaId])

  const rate = useCallback(async (rating: number): Promise<boolean> => {
    if (!uid) return false
    setSubmitting(true)
    setRateError('')
    try {
      const key = `${dramaId}_${uid}`

      await setDoc(doc(db, 'ratings', key), {
        dramaId, userId: uid, rating, updatedAt: serverTimestamp(),
      }, { merge: true })

      setUserRating(rating)

      // Optimistic aggregate update
      const isNew = userRating === 0
      const newCount = isNew ? summary.count + 1 : summary.count
      const newTotal = summary.avg * summary.count - (isNew ? 0 : userRating) + rating
      const avg = newCount > 0 ? Math.round((newTotal / newCount) * 10) / 10 : rating
      const newDist = { ...summary.dist }
      if (!isNew && userRating > 0) newDist[userRating] = Math.max(0, (newDist[userRating] ?? 0) - 1)
      newDist[rating] = (newDist[rating] ?? 0) + (isNew ? 1 : 0)
      setSummary({ avg, count: newCount, dist: newDist })

      // Persist aggregate to drama doc (best-effort)
      updateDoc(doc(db, 'dramas', dramaId), { rating: avg, ratingCount: newCount })
        .catch(() => setDoc(doc(db, 'dramas', dramaId), { rating: avg, ratingCount: newCount }, { merge: true }).catch(() => {}))

      return true
    } catch (e: any) {
      const code: string = e?.code ?? e?.message ?? String(e)
      if (process.env.NODE_ENV === 'development') console.error('[useRating]', code, e)
      setRateError(code)
      return false
    } finally {
      setSubmitting(false)
    }
  }, [uid, dramaId, userRating, summary])

  return { uid, userRating, summary, rate, submitting, rateError }
}
