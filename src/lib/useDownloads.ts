'use client'
import { useCallback, useEffect, useState } from 'react'

export interface DownloadMeta {
  url:        string
  key:        string   // `${dramaId}_${episodeId}`
  title:      string
  dramaTitle: string
  dramaId:    string
  episodeIdx: number
  savedAt:    number
}

const STORE = 'rs-downloads'

function read(): DownloadMeta[] {
  try { return JSON.parse(localStorage.getItem(STORE) ?? '[]') } catch { return [] }
}
function write(list: DownloadMeta[]) {
  localStorage.setItem(STORE, JSON.stringify(list))
}

export function useDownloads() {
  const [downloads, setDownloads]   = useState<DownloadMeta[]>([])
  const [pending, setPending]       = useState<Set<string>>(new Set()) // keys in progress
  const [dlErrors, setDlErrors]     = useState<Record<string, string>>({})

  useEffect(() => { setDownloads(read()) }, [])

  // Listen for SW responses
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return
    const handler = (e: MessageEvent) => {
      const { type, url, error } = e.data ?? {}
      if (type === 'CACHE_DONE') {
        // Find key by URL
        const entry = read().find(d => d.url === url)
        if (entry) setPending(p => { const n = new Set(p); n.delete(entry.key); return n })
        setDownloads(read())
      }
      if (type === 'CACHE_ERROR') {
        const entry = read().find(d => d.url === url)
        if (entry) {
          setPending(p => { const n = new Set(p); n.delete(entry.key); return n })
          write(read().filter(d => d.url !== url))
          setDownloads(read())
          setDlErrors(prev => ({ ...prev, [entry.key]: error ?? 'Erro' }))
        }
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  const download = useCallback((meta: Omit<DownloadMeta, 'savedAt'>) => {
    const sw = navigator.serviceWorker?.controller
    if (!sw) return
    const entry: DownloadMeta = { ...meta, savedAt: Date.now() }
    const list = [...read().filter(d => d.key !== meta.key), entry]
    write(list)
    setDownloads(list)
    setPending(p => new Set(p).add(meta.key))
    setDlErrors(prev => { const n = { ...prev }; delete n[meta.key]; return n })
    sw.postMessage({ type: 'CACHE_VIDEO', url: meta.url })
  }, [])

  const remove = useCallback((key: string) => {
    const list  = read()
    const entry = list.find(d => d.key === key)
    const next  = list.filter(d => d.key !== key)
    write(next)
    setDownloads(next)
    if (entry) navigator.serviceWorker?.controller?.postMessage({ type: 'DELETE_VIDEO', url: entry.url })
  }, [])

  const isDownloaded  = (key: string) => downloads.some(d => d.key === key) && !pending.has(key)
  const isDownloading = (key: string) => pending.has(key)

  return { downloads, pending, dlErrors, download, remove, isDownloaded, isDownloading }
}
