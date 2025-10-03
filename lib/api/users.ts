export type ApiUser = {
  id: string
  walletAddress: string
  bnsName: string
  displayName: string
  profileImage: string | null
  bio: string | null
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


