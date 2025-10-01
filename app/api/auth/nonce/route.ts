import { NextResponse } from 'next/server'

function generateNonce(length = 24) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

export async function GET() {
  const nonce = generateNonce()
  return NextResponse.json({ nonce })
}


