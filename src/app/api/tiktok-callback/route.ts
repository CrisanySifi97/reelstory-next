import { NextRequest, NextResponse } from 'next/server'

const CLIENT_KEY    = process.env.TT_CLIENT_KEY!
const CLIENT_SECRET = process.env.TT_CLIENT_SECRET!
const REDIRECT_URI  = 'https://reelstory-next.vercel.app/api/tiktok-callback'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return new NextResponse(html(`
      <h2 style="color:red">Erro na autorização TikTok</h2>
      <p>${error}: ${searchParams.get('error_description') ?? ''}</p>
    `), { headers: { 'Content-Type': 'text/html' } })
  }

  if (!code) {
    return new NextResponse(html('<h2>Código não recebido.</h2>'), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // Trocar código por token
  const body = new URLSearchParams({
    client_key:    CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    code,
    grant_type:    'authorization_code',
    redirect_uri:  REDIRECT_URI,
  })

  const res  = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })

  const data = await res.json()

  if (data.error) {
    return new NextResponse(html(`
      <h2 style="color:red">Erro a trocar token</h2>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    `), { headers: { 'Content-Type': 'text/html' } })
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString().split('T')[0]
  const refreshExpiresAt = new Date(Date.now() + data.refresh_expires_in * 1000).toISOString().split('T')[0]

  return new NextResponse(html(`
    <h2 style="color:green">✅ TikTok ligado com sucesso!</h2>
    <p>Copia os valores abaixo e guarda no MCP server (<code>tokens.json</code>):</p>

    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;font-weight:bold">tt_open_id</td>
          <td><code style="background:#f0f0f0;padding:4px">${data.open_id}</code></td></tr>
      <tr><td style="padding:8px;font-weight:bold">tt_access_token</td>
          <td><code style="background:#f0f0f0;padding:4px;word-break:break-all">${data.access_token}</code></td></tr>
      <tr><td style="padding:8px;font-weight:bold">tt_refresh_token</td>
          <td><code style="background:#f0f0f0;padding:4px;word-break:break-all">${data.refresh_token}</code></td></tr>
      <tr><td style="padding:8px;font-weight:bold">Expira em</td>
          <td>${expiresAt} (access) / ${refreshExpiresAt} (refresh)</td></tr>
    </table>

    <br>
    <p style="color:#666">Após copiar, podes fechar esta janela.</p>
  `), { headers: { 'Content-Type': 'text/html' } })
}

function html(body: string) {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TikTok OAuth — ReelStory</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 60px auto; padding: 0 20px; }
    code { font-family: monospace; }
  </style>
</head>
<body>
  <h1>ReelStory — TikTok Auth</h1>
  ${body}
</body>
</html>`
}
