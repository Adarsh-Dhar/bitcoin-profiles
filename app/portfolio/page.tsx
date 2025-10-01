import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

const holdings = [
  {
    id: 1,
    username: "satoshi.btc",
    keysHeld: 5,
    currentValue: "0.0125 BTC",
    avatar: "/placeholder.svg?height=80&width=80",
  },
  {
    id: 2,
    username: "hal.btc",
    keysHeld: 8,
    currentValue: "0.0144 BTC",
    avatar: "/placeholder.svg?height=80&width=80",
  },
  {
    id: 3,
    username: "vitalik.btc",
    keysHeld: 3,
    currentValue: "0.0096 BTC",
    avatar: "/placeholder.svg?height=80&width=80",
  },
  { id: 4, username: "cz.btc", keysHeld: 6, currentValue: "0.0126 BTC", avatar: "/placeholder.svg?height=80&width=80" },
  {
    id: 5,
    username: "saylor.btc",
    keysHeld: 4,
    currentValue: "0.0112 BTC",
    avatar: "/placeholder.svg?height=80&width=80",
  },
  {
    id: 6,
    username: "jack.btc",
    keysHeld: 9,
    currentValue: "0.0171 BTC",
    avatar: "/placeholder.svg?height=80&width=80",
  },
]

export default function PortfolioPage() {
  const totalValue = holdings.reduce((sum, h) => sum + Number.parseFloat(h.currentValue), 0)
  const totalKeys = holdings.reduce((sum, h) => sum + h.keysHeld, 0)

  return (
    <div>
      <h1 className="text-5xl font-bold mb-8">My Key Portfolio</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-primary/10 border-primary">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-2">Total Holdings Value</div>
            <div className="text-4xl font-bold text-primary">{totalValue.toFixed(4)} BTC</div>
          </CardContent>
        </Card>

        <Card className="bg-secondary">
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground mb-2">Total Keys Owned</div>
            <div className="text-4xl font-bold">{totalKeys}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {holdings.map((holding) => (
          <Link key={holding.id} href={`/profile/${holding.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={holding.avatar || "/placeholder.svg"} alt={holding.username} />
                    <AvatarFallback className="text-xl">{holding.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{holding.username}</h3>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Keys Held</span>
                    <span className="font-semibold">{holding.keysHeld}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Current Value</span>
                    <span className="font-semibold text-primary">{holding.currentValue}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
