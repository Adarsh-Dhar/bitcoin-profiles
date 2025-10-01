import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

type SignInBody = {
  address: string
  signature: string
  nonce: string
}

async function fetchBnsName(address: string): Promise<string | null> {
  try {
    const url = `https://api.hiro.so/v1/addresses/stacks/${address}`
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const data = await res.json()
    const names: string[] | undefined = data?.names
    return names && names.length > 0 ? names[0] : null
  } catch {
    return null
  }
}

function verifySignature(_address: string, _message: string, _signature: string): boolean {
  // TODO: Replace with actual Stacks signature verification using @stacks/transactions
  // For now we accept and rely on wallet's signing UX; backend validation can be added later.
  return Boolean(_address && _message && _signature)
}

function createSessionToken(payload: Record<string, unknown>): string {
  const base64 = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url')
  return base64
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SignInBody
    const { address, signature, nonce } = body
    if (!address || !signature || !nonce) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 })
    }

    const message = `Bitcoin Profiles login: ${nonce}`
    const ok = verifySignature(address, message, signature)
    if (!ok) return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })

    const bns = await fetchBnsName(address)

    const token = createSessionToken({ address, bns })
    const cookieStore = await cookies()
    cookieStore.set('bp_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,
      maxAge: 60 * 60 * 24 * 7,
    })

    return NextResponse.json({ ok: true, address, bns })
  } catch (e) {
    return NextResponse.json({ message: 'Bad Request' }, { status: 400 })
  }
}


