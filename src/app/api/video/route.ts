import { NextRequest, NextResponse } from 'next/server'

// Proxy de vídeos Cloudinary para domínio verificado pelo TikTok
// Uso: /api/video?id=ep033_msrctz
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? 'dqkbj1qjp'
  const videoUrl  = `https://res.cloudinary.com/${cloudName}/video/upload/${id}.mp4`

  const upstream = await fetch(videoUrl)
  if (!upstream.ok) {
    return NextResponse.json({ error: 'vídeo não encontrado' }, { status: 404 })
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type':  'video/mp4',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
