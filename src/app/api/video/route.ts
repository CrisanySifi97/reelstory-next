import { NextRequest, NextResponse } from 'next/server'

// Proxy de vídeos Bunny Stream para domínio verificado pelo TikTok
// Uso: /api/video?id={guid}
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 })
  }

  const streamCdn   = process.env.NEXT_PUBLIC_BUNNY_STREAM_CDN ?? 'vz-a625f850-996.b-cdn.net'
  const libraryId   = process.env.BUNNY_STREAM_LIBRARY_ID ?? ''
  const streamApiKey = process.env.BUNNY_STREAM_API_KEY ?? ''

  // Bunny só gera MP4 nas resoluções reais do vídeo de origem — descobrir a melhor disponível
  let resolution = '360p'
  if (libraryId && streamApiKey) {
    const infoRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${id}`, {
      headers: { AccessKey: streamApiKey },
      cache: 'no-store',
    })
    if (infoRes.ok) {
      const info = await infoRes.json()
      const resolutions = (info.availableResolutions || '').split(',').filter(Boolean)
      if (resolutions.length) resolution = resolutions.sort((a: string, b: string) => parseInt(a) - parseInt(b)).pop()
    }
  }

  const videoUrl = `https://${streamCdn}/${id}/play_${resolution}.mp4`

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
