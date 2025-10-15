"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { listUsers, type ApiUser } from "@api/users"

export default function HomePage() {
  const [users, setUsers] = useState<ApiUser[]>([])

  useEffect(() => {
    let mounted = true
    listUsers().then((u) => {
      if (mounted) setUsers(u)
    }).catch(() => {
      if (mounted) setUsers([])
    })
    return () => { mounted = false }
  }, [])
  return (
    <div>
      <h1 className="text-5xl font-bold mb-8">Users</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {users.map((user) => (
          <Link key={user.id} href={`/chat`}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="font-semibold text-lg mb-1 truncate">{user.walletAddress}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
