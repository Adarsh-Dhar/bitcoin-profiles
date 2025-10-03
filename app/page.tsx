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
      <h1 className="text-5xl font-bold mb-8">Profiles</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {users.map((user) => (
          <Link key={user.id} href={`/profile/${user.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={user.profileImage ?? undefined} alt={user.displayName} />
                  <AvatarFallback className="text-2xl">{user.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg mb-1">{user.displayName}</h3>
                <div className="text-muted-foreground">{user.bnsName}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
