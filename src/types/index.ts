export interface Drama {
  id: string
  title: string
  genre: 'romance' | 'suspense' | 'comedia' | 'terror' | 'acao' | 'corporativo'
  description: string
  short?: string
  status: 'Ativo' | 'Rascunho' | 'Pausado'
  rating: number
  views: number
  episodes: Episode[]
  posterGrad?:   string
  posterImage?:  string
  bannerImage?:  string
  badge?: 'NOVO' | 'HOT' | 'TOP' | 'EXCLUSIVO'
  cast?: string[]
  year?: number
  icon?: string
  createdAt?: Date
}

export interface Episode {
  id?: string
  title: string
  ytId?: string
  url?: string
  publicId?: string
  thumbnail?: string
  free: boolean
  order: number
}

export interface UserProfile {
  uid: string
  name: string
  email: string
  avatar: string
  plan: 'Gratuito' | 'Starter' | 'Premium' | 'VIP'
  coins: number
  status: 'Ativo' | 'Suspenso'
  isAdmin: boolean
  phone?: string
  createdAt?: Date
  lastLogin?: string
  notifOn?: boolean
  fcmToken?: string
  referralCode?: string
  referredBy?: string | null
  referralBonusPaid?: boolean
  dob?: string
  bio?: string
  lang?: string
  genres?: string[]
  notifEps?: boolean
  notifPromo?: boolean
  autoplay?: boolean
  dataMode?: boolean
  pointsHistory?: { pkg: string; pts: number; date: string; orderId?: string; note?: string }[]
}

export interface PointsPackage {
  key: string
  name: string
  pts: number
  bonus: number
  priceKz: number
  priceAnnualKz?: number
  kursinhaUrl: string
  badge?: string
}

export interface Order {
  id?: string
  userId: string
  userEmail: string
  userName: string
  type: 'points'
  package: string
  points: number
  amount: string
  method: string
  phone?: string
  reference?: string
  status: 'Pendente' | 'Aprovado' | 'Rejeitado'
  createdAt?: Date
}

export const GENRE_LABELS: Record<Drama['genre'], string> = {
  romance:     'Romance',
  suspense:    'Suspense',
  comedia:     'Comédia',
  terror:      'Terror',
  acao:        'Acção',
  corporativo: 'Corporativo',
}

export const POINTS_PACKAGES: PointsPackage[] = [
  { key:'basic',   name:'Basico',    pts:100,  bonus:0,   priceKz:1000,  kursinhaUrl: process.env.NEXT_PUBLIC_KURSINHA_BASIC_URL   ?? 'https://pay.kursinha.com/c/6a01a97460b5a002d3e34d85' },
  { key:'popular', name:'Popular',   pts:550,  bonus:50,  priceKz:4500,  kursinhaUrl: process.env.NEXT_PUBLIC_KURSINHA_POPULAR_URL ?? 'https://pay.kursinha.com/c/6a01aa75f10214290866c137', badge:'Mais Popular' },
  { key:'mega',    name:'Mega',      pts:1400, bonus:200, priceKz:9900,  kursinhaUrl: process.env.NEXT_PUBLIC_KURSINHA_MEGA_URL    ?? 'https://pay.kursinha.com/c/6a01ab0a9b9ba2580ae9aee7', badge:'Melhor Valor' },
  { key:'vip',     name:'Ultra VIP', pts:4000, bonus:500, priceKz:24900, kursinhaUrl: process.env.NEXT_PUBLIC_KURSINHA_VIP_URL     ?? 'https://pay.kursinha.com/c/6a01aba1f10214290866c138', badge:'VIP' },
]
