export type ApiUser = {
  id: string
  walletAddress: string
  createdAt: string
}

export async function listUsers(init?: RequestInit): Promise<ApiUser[]> {
  const res = await fetch('/api/user', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...init,
    // next.js fetch caching hint for client usage; callers can override
    cache: 'no-store',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to load users')
  }
  const data = (await res.json()) as { users: ApiUser[] }
  return data.users
}

async function getUserByWalletAddress(walletAddress: string, init?: RequestInit) {
  const url = new URL('/api/user/me', typeof window === 'undefined' ? 'http://localhost' : window.location.origin)
  url.searchParams.set('walletAddress', walletAddress)
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...init,
    cache: 'no-store',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Failed to load user')
  }
  const data = await res.json()
  return data.user as Pick<ApiUser, 'walletAddress'>
}


