'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Bookmark, Coins, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/inicio',  icon: Home,     label: 'INÍCIO' },
  { href: '/explorar',icon: Search,   label: 'SÉRIES' },
  { href: '/lista',   icon: Bookmark, label: 'LISTA'  },
  { href: '/pontos',  icon: Coins,    label: 'PONTOS' },
  { href: '/perfil',  icon: User,     label: 'PERFIL' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 'calc(58px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'rgba(14,14,14,.97)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,.08)',
        zIndex: 8000,
        display: 'none',
      }} className="bottom-nav">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, textDecoration: 'none',
                color: active ? '#fff' : 'var(--rs-text-faint)',
                fontSize: '.6rem', fontWeight: 700,
                letterSpacing: '.6px', textTransform: 'uppercase',
                borderTop: active ? '2px solid var(--rs-primary)' : '2px solid transparent',
                padding: '6px .2rem 0',
                transition: 'color .2s, border-top-color .2s',
              }}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
      <style>{`
        @media (max-width: 768px) { .bottom-nav { display: flex !important; } }
      `}</style>
    </>
  )
}
