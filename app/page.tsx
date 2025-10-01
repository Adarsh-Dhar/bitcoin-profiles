import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

const trendingProfiles = [
  { id: 1, username: "satoshi.btc", keyPrice: "0.0025 BTC", avatar: "/placeholder.svg?height=80&width=80" },
  { id: 2, username: "hal.btc", keyPrice: "0.0018 BTC", avatar: "/placeholder.svg?height=80&width=80" },
  { id: 3, username: "vitalik.btc", keyPrice: "0.0032 BTC", avatar: "/placeholder.svg?height=80&width=80" },
  { id: 4, username: "cz.btc", keyPrice: "0.0021 BTC", avatar: "/placeholder.svg?height=80&width=80" },
  { id: 5, username: "saylor.btc", keyPrice: "0.0028 BTC", avatar: "/placeholder.svg?height=80&width=80" },
  { id: 6, username: "jack.btc", keyPrice: "0.0019 BTC", avatar: "/placeholder.svg?height=80&width=80" },
  { id: 7, username: "elon.btc", keyPrice: "0.0035 BTC", avatar: "/placeholder.svg?height=80&width=80" },
  { id: 8, username: "cathie.btc", keyPrice: "0.0015 BTC", avatar: "/placeholder.svg?height=80&width=80" },
  { id: 9, username: "balaji.btc", keyPrice: "0.0022 BTC", avatar: "/placeholder.svg?height=80&width=80" },
  { id: 10, username: "nic.btc", keyPrice: "0.0017 BTC", avatar: "/placeholder.svg?height=80&width=80" },
  { id: 11, username: "andreas.btc", keyPrice: "0.0024 BTC", avatar: "/placeholder.svg?height=80&width=80" },
  { id: 12, username: "adam.btc", keyPrice: "0.0020 BTC", avatar: "/placeholder.svg?height=80&width=80" },
]

export default function HomePage() {
  return (
    <div>
      <h1 className="text-5xl font-bold mb-8">Trending Profiles</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {trendingProfiles.map((profile) => (
          <Link key={profile.id} href={`/profile/${profile.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={profile.avatar || "/placeholder.svg"} alt={profile.username} />
                  <AvatarFallback className="text-2xl">{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg mb-2">{profile.username}</h3>
                <div className="text-primary font-bold">{profile.keyPrice}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
