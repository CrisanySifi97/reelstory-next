import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue, Transaction } from 'firebase-admin/firestore'

function getAdminDb() {
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
  return getFirestore()
}

const PACKAGE_MAP: Record<string, { pts: number; bonus: number; name: string; priceKz: number }> = {
  '6a01a97460b5a002d3e34d85': { pts: 100,  bonus: 0,   name: 'Basico',    priceKz: 1000  },
  '6a01aa75f10214290866c137': { pts: 550,  bonus: 50,  name: 'Popular',   priceKz: 4500  },
  '6a01ab0a9b9ba2580ae9aee7': { pts: 1400, bonus: 200, name: 'Mega',      priceKz: 9900  },
  '6a01aba1f10214290866c138': { pts: 4000, bonus: 500, name: 'Ultra VIP', priceKz: 24900 },
}

export async function POST(req: NextRequest) {
  try {
    // Reject calls that don't carry the shared secret configured in the Kursinha webhook URL
    const token = req.nextUrl.searchParams.get('token')
    if (!process.env.KURSINHA_WEBHOOK_TOKEN || token !== process.env.KURSINHA_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await req.json()

    // Accept payment.success or checkout.completed events
    if (body.event !== 'payment.success' && body.event !== 'checkout.completed') {
      return NextResponse.json({ ok: true, msg: 'event ignored' })
    }

    const data        = body.data ?? body
    const userId      = (data.metadata?.userId ?? data.userId ?? '').trim()
    const orderId     = (data.orderId ?? data.order_id ?? data.id ?? '').trim()
    const checkoutId  = (data.checkoutId ?? data.checkout_id ?? '').replace(/^.*\//, '').trim()

    if (!userId)     return NextResponse.json({ error: 'no userId'  }, { status: 400 })
    if (!checkoutId) return NextResponse.json({ error: 'no checkoutId' }, { status: 400 })

    const pkg = PACKAGE_MAP[checkoutId]
    if (!pkg) return NextResponse.json({ error: 'unknown package' }, { status: 400 })

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

    const totalPts = pkg.pts + pkg.bonus

    // Credit user
    await db.collection('users').doc(userId).update({
      coins: FieldValue.increment(totalPts),
      pointsHistory: FieldValue.arrayUnion({
        pkg: pkg.name,
        pts: totalPts,
        date: new Date().toLocaleDateString('pt-AO'),
        orderId,
      }),
    })

    // ── Referral bonus: 100 pts to referrer on first purchase ──
    // Wrapped in a transaction so the "already paid" check and the write are atomic,
    // preventing a double payout if the webhook fires twice for the same user.
    await db.runTransaction(async (tx: Transaction) => {
      const userRef  = db.collection('users').doc(userId)
      const userSnap = await tx.get(userRef)
      const userData = userSnap.data()
      if (!userData?.referredBy || userData?.referralBonusPaid) return

      const referrersSnap = await tx.get(
        db.collection('users').where('referralCode', '==', userData.referredBy).limit(1)
      )
      if (referrersSnap.empty) return

      const referrerId = referrersSnap.docs[0].id
      tx.update(db.collection('users').doc(referrerId), {
        coins: FieldValue.increment(100),
        pointsHistory: FieldValue.arrayUnion({
          pkg: 'Convite',
          pts: 100,
          date: new Date().toLocaleDateString('pt-AO'),
          note: `Bônus por convite de ${userData.name || userId}`,
        }),
      })
      tx.update(userRef, { referralBonusPaid: true })
    })

    // Save order record
    await db.collection('orders').add({
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

    return NextResponse.json({ ok: true, pts: totalPts })
  } catch (err) {
    console.error('[kursinha-webhook]', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
