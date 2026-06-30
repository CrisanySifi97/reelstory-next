import { NextRequest, NextResponse } from 'next/server'

// Proxy de vídeos Bunny Stream para domínio verificado pelo TikTok
// Uso: /api/video?id={guid}
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  const streamCdn = process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN ?? 'vz-a625f850-996.b-cdn.net'
  const videoUrl  = `https://${streamCdn}/${id}/play_360p.mp4`

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
