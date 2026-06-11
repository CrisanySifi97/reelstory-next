import type { Metadata, Viewport } from 'next'
import '@/styles/globals.css'
import PWARegister from '@/components/PWARegister'

const APP_URL = 'https://reelstory-next.vercel.app'

export const metadata: Metadata = {
  title: 'ReelStory — Microdramas verticais · Angola',
  description: 'Desbloqueia episódios com pontos. Sem mensalidades, pagas só o que consomes. Séries angolanas em formato vertical.',
  manifest: '/manifest.json',
  keywords: ['dramas', 'séries', 'angola', 'microdramas', 'streaming', 'reelstory'],
  authors: [{ name: 'ReelStory' }],

  // Apple / iOS PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ReelStory',
    startupImage: [
      { url: '/icon-512.png' },
    ],
  },

  // Open Graph (partilha em redes sociais)
  openGraph: {
    type: 'website',
    url: APP_URL,
    title: 'ReelStory — Microdramas verticais',
    description: 'Séries angolanas em formato vertical. Desbloqueia episódios com pontos.',
    siteName: 'ReelStory',
    images: [{ url: `${APP_URL}/icon-512.png`, width: 512, height: 512, alt: 'ReelStory' }],
  },

  // Twitter / X Card
  twitter: {
    card: 'summary',
    title: 'ReelStory — Microdramas verticais',
    description: 'Séries angolanas em formato vertical. Desbloqueia episódios com pontos.',
    images: [`${APP_URL}/icon-512.png`],
  },

  // Icons
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-180.png', sizes: '180x180' }],
    shortcut: '/icon-192.png',
  },

  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#FF385C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" translate="no" suppressHydrationWarning>
      <head>
        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="ReelStory"/>
        <meta name="mobile-web-app-capable" content="yes"/>

        {/* iOS splash & touch icon */}
        <link rel="apple-touch-icon" href="/icon-180.png"/>
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png"/>
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png"/>

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet"/>
      </head>
      <body suppressHydrationWarning>
        {children}
        <PWARegister/>
      </body>
    </html>
  )
}
