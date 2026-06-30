import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/verifyAdmin'

const STORAGE_ZONE     = process.env.BUNNY_STORAGE_ZONE     ?? ''
const STORAGE_PASSWORD = process.env.BUNNY_STORAGE_PASSWORD ?? ''
const STORAGE_CDN      = process.env.NEXT_PUBLIC_BUNNY_STORAGE_CDN ?? ''

interface BunnyFile {
  ObjectName: string
  IsDirectory: boolean
  Length: number
  LastChanged: string
}

export async function GET(req: NextRequest) {
  if (!STORAGE_ZONE || !STORAGE_PASSWORD || !STORAGE_CDN) {
    return NextResponse.json({ error: 'Bunny Storage não configurado' }, { status: 500 })
  }

  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const folder = (searchParams.get('folder') ?? '').replace(/^\/+|\/+$/g, '')

  const res = await fetch(`https://storage.bunnycdn.com/${STORAGE_ZONE}/${folder ? folder + '/' : ''}`, {
    headers: { AccessKey: STORAGE_PASSWORD },
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json({ error: await res.text() }, { status: res.status })
  }

  const files: BunnyFile[] = await res.json()

  const assets = files
    .filter(f => !f.IsDirectory && /\.(png|jpe?g|webp|gif)$/i.test(f.ObjectName))
    .map(f => ({
      public_id:    `${folder}/${f.ObjectName}`,
      secure_url:   `https://${STORAGE_CDN}/${folder ? folder + '/' : ''}${f.ObjectName}`,
      format:       f.ObjectName.split('.').pop(),
      width:        0,
      height:       0,
      bytes:        f.Length,
      created_at:   f.LastChanged,
      folder,
      display_name: f.ObjectName,
    }))

  return NextResponse.json({ assets, next_cursor: null, total: assets.length })
}
