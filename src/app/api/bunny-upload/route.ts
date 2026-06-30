import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/verifyAdmin'

const STORAGE_ZONE     = process.env.BUNNY_STORAGE_ZONE     ?? ''
const STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD ?? ''
const STORAGE_CDN      = process.env.NEXT_PUBLIC_BUNNY_STORAGE_CDN ?? ''

export async function POST(req: NextRequest) {
  if (!STORAGE_ZONE || !STORAGE_PASSWORD || !STORAGE_CDN) {
    return NextResponse.json({ error: 'Bunny Storage não configurado' }, { status: 500 })
  }

  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const form = await req.formData()
  const file   = form.get('file') as File | null
  const folder = (form.get('folder') as string | null) ?? 'banners'
  if (!file) return NextResponse.json({ error: 'Ficheiro em falta' }, { status: 400 })

  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const remotePath = `${folder}/${safeName}`

  const res = await fetch(`https://storage.bunnycdn.com/${STORAGE_ZONE}/${remotePath}`, {
    method: 'PUT',
    headers: { AccessKey: STORAGE_PASSWORD, 'Content-Type': file.type || 'application/octet-stream' },
    body: Buffer.from(await file.arrayBuffer()),
  })

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: res.status })
  }

  return NextResponse.json({ secure_url: `https://${STORAGE_CDN}/${remotePath}` })
}
