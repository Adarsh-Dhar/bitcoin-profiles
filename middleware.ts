import { NextResponse, type NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { nextUrl } = req
  const { pathname } = nextUrl

  // Allowlist: API routes, Next.js assets, and public files
  const isApiRoute = pathname.startsWith('/api')
  const isNextAsset = pathname.startsWith('/_next')
  const isStaticAsset =
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/public') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|txt|json|xml|mp4|mp3)$/)

  if (isApiRoute || isNextAsset || isStaticAsset) {
    return NextResponse.next()
  }

  // No auth redirect; allow access

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}


