import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue, Transaction } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// Must run before getAuth()/getFirestore() are called anywhere in this module —
// they both need a default app to already exist.
function ensureAdminApp() {
  if (!getApps().length) {
    // Use individual env vars (set in Vercel) instead of full JSON blob
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // Vercel stores the private key with literal \n — replace them
        privateKey:  (process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
      }),
    })
  }
}
function getAdminDb() {
  ensureAdminApp()
  return getFirestore()
}

// checkoutId -> package key (matches the doc IDs in the Firestore "packages" collection,
// which the admin "Pacotes" section edits)
const CHECKOUT_TO_KEY: Record<string, string> = {
  '6a01a97460b5a002d3e34d85': 'basic',
  '6a01aa75f10214290866c137': 'popular',
  '6a01ab0a9b9ba2580ae9aee7': 'mega',
  '6a01aba1f10214290866c138': 'vip',
}

// Defaults — used when the admin hasn't overridden a package in Firestore yet
const PACKAGE_DEFAULTS: Record<string, { pts: number; bonus: number; name: string; priceKz: number }> = {
  basic:   { pts: 100,  bonus: 0,   name: 'Basico',    priceKz: 1000  },
  popular: { pts: 550,  bonus: 50,  name: 'Popular',   priceKz: 4500  },
  mega:    { pts: 1400, bonus: 200, name: 'Mega',      priceKz: 9900  },
  vip:     { pts: 4000, bonus: 500, name: 'Ultra VIP', priceKz: 24900 },
}

export async function POST(req: NextRequest) {
  try {
    ensureAdminApp()

    // Reject calls that don't carry the shared secret configured in the Kursinha webhook URL
    const token = req.nextUrl.searchParams.get('token')
    if (!process.env.KURSINHA_WEBHOOK_TOKEN || token !== process.env.KURSINHA_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Log full payload so we can inspect it in Vercel function logs
    console.log('[kursinha-webhook] event:', body.event)
    console.log('[kursinha-webhook] payload:', JSON.stringify(body, null, 2))

    // Accept payment.success or checkout.completed events
    if (body.event !== 'payment.success' && body.event !== 'checkout.completed') {
      console.log('[kursinha-webhook] ignoring event:', body.event)
      return NextResponse.json({ ok: true, msg: 'event ignored' })
    }

    const data       = body.data ?? body
    let userId       = (data.metadata?.userId ?? data.userId ?? '').trim()
    const orderId    = (data.orderId ?? data.order_id ?? data.id ?? '').trim()
    const checkoutId = (data.checkoutId ?? data.checkout_id ?? data.checkout?.id ?? '').replace(/^.*\//, '').trim()
    const email      = (data.email ?? data.customer?.email ?? data.buyer?.email ?? '').trim().toLowerCase()

    // If no userId from metadata, resolve via the buyer's email (Option B)
    if (!userId && email) {
      try {
        const userRecord = await getAuth().getUserByEmail(email)
        userId = userRecord.uid
        console.log('[kursinha-webhook] resolved userId from email:', email, '→', userId)
      } catch (err) {
        console.log('[kursinha-webhook] no Firebase user found for email:', email, '—', (err as Error).message)
      }
    }

    console.log('[kursinha-webhook] parsed — userId:', userId, '| email:', email, '| orderId:', orderId, '| checkoutId:', checkoutId)

    if (!userId)     return NextResponse.json({ error: 'no userId'  }, { status: 400 })
    if (!checkoutId) return NextResponse.json({ error: 'no checkoutId' }, { status: 400 })

    const pkgKey = CHECKOUT_TO_KEY[checkoutId]
    if (!pkgKey) return NextResponse.json({ error: 'unknown package' }, { status: 400 })

    const db = getAdminDb()

    // ── Idempotency: skip if this orderId was already processed ──
    if (orderId) {
      const existing = await db.collection('orders')
        .where('kursinhaOrderId', '==', orderId)
        .limit(1)
        .get()
      if (!existing.empty) {
        return NextResponse.json({ ok: true, msg: 'already processed' })
      }
    }

    // Merge admin overrides from the "packages" collection (edited via the admin "Pacotes"
    // section) on top of the hardcoded defaults, so price/point changes there actually
    // affect what gets credited.
    const overrideSnap = await db.collection('packages').doc(pkgKey).get()
    const pkg = { ...PACKAGE_DEFAULTS[pkgKey], ...overrideSnap.data() }
    const totalPts = pkg.pts + pkg.bonus

    // Credit user, pay referral bonus and save the order atomically.
    // Firestore transactions require all reads before any writes.
    const orderRef = db.collection('orders').doc()
    await db.runTransaction(async (tx: Transaction) => {
      const userRef  = db.collection('users').doc(userId)
      const userSnap = await tx.get(userRef)
      const userData = userSnap.data()

      let referrerId: string | null = null
      if (userData?.referredBy && !userData?.referralBonusPaid) {
        const referrersSnap = await tx.get(
          db.collection('users').where('referralCode', '==', userData.referredBy).limit(1)
        )
        if (!referrersSnap.empty) referrerId = referrersSnap.docs[0].id
      }

      const userUpdate: Record<string, unknown> = {
        coins: FieldValue.increment(totalPts),
        pointsHistory: FieldValue.arrayUnion({
          pkg: pkg.name,
          pts: totalPts,
          date: new Date().toLocaleDateString('pt-AO'),
          orderId,
        }),
      }

      // ── Referral bonus: 100 pts to referrer on first purchase ──
      if (referrerId) {
        userUpdate.referralBonusPaid = true
        tx.update(db.collection('users').doc(referrerId), {
          coins: FieldValue.increment(100),
          pointsHistory: FieldValue.arrayUnion({
            pkg: 'Convite',
            pts: 100,
            date: new Date().toLocaleDateString('pt-AO'),
            note: `Bônus por convite de ${userData!.name || userId}`,
          }),
        })
      }

      tx.update(userRef, userUpdate)

      tx.set(orderRef, {
        userId,
        userEmail:        data.email ?? '',
        userName:         data.name  ?? '',
        type:             'points',
        package:          pkg.name,
        points:           totalPts,
        amount:           String(data.amount ?? pkg.priceKz),
        method:           'Kursinha',
        status:           'Aprovado',
        kursinhaOrderId:  orderId,
        createdAt:        FieldValue.serverTimestamp(),
      })
    })

    return NextResponse.json({ ok: true, pts: totalPts })
  } catch (err) {
    console.error('[kursinha-webhook]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
