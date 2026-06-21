import { NextResponse } from 'next/server'

export async function GET() {
  return new NextResponse('tiktok-developers-site-verification=zV1OP87m2KCyWgxvt5rr4AZGTkngMRkB', {
    headers: { 'Content-Type': 'text/plain' },
  })
}
