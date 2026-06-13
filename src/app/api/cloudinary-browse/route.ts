import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/verifyAdmin'

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ''
const API_KEY    = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY    ?? ''
const API_SECRET = process.env.CLOUDINARY_API_SECRET             ?? ''

export async function GET(req: NextRequest) {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json({ error: 'Cloudinary não configurado' }, { status: 500 })
  }

  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const folder      = searchParams.get('folder') ?? ''
  const type        = searchParams.get('type')   ?? 'image'   // 'image' | 'video'
  const maxResults  = Math.min(parseInt(searchParams.get('max') ?? '100'), 200)
  const nextCursor  = searchParams.get('next_cursor') ?? ''

  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')

  const params = new URLSearchParams({
    type:        'upload',
    max_results: String(maxResults),
    resource_type: type,
  })
  if (folder)     params.set('prefix', folder)
  if (nextCursor) params.set('next_cursor', nextCursor)

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/${type}?${params}`

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json()

  const assets = (data.resources ?? []).map((r: any) => ({
    public_id:   r.public_id,
    secure_url:  r.secure_url,
    format:      r.format,
    width:       r.width,
    height:      r.height,
    bytes:       r.bytes,
    created_at:  r.created_at,
    folder:      r.asset_folder ?? r.public_id.split('/').slice(0, -1).join('/'),
    display_name: r.display_name ?? r.public_id.split('/').pop(),
  }))

  return NextResponse.json({
    assets,
    next_cursor: data.next_cursor ?? null,
    total:       data.total_count ?? assets.length,
  })
}
