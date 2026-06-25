'use client'
import { useState, useEffect, useCallback } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export function useMyList() {
  const [uid, setUid]       = useState<string | null>(null)
  const [myList, setMyList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { setUid(null); setMyList([]); setLoading(false); return }
      setUid(user.uid)
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists()) setMyList(snap.data().myList ?? [])
      } catch (err) { console.error('[useMyList] erro ao carregar', err) }
      setLoading(false)
    })
    return unsub
  }, [])

  const toggle = useCallback(async (dramaId: string): Promise<'added' | 'removed' | 'login'> => {
    if (!uid) return 'login'
    const isIn = myList.includes(dramaId)
    try {
      await updateDoc(doc(db, 'users', uid), {
        myList: isIn ? arrayRemove(dramaId) : arrayUnion(dramaId),
      })
      setMyList(prev => isIn ? prev.filter(id => id !== dramaId) : [...prev, dramaId])
      return isIn ? 'removed' : 'added'
    } catch (err) { console.error('[useMyList] erro ao actualizar', err); return 'login' }
  }, [uid, myList])

  const isInList = (dramaId: string) => myList.includes(dramaId)

  return { myList, toggle, isInList, uid, loading }
}
