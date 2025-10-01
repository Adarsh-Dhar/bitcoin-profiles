import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Bitcoin } from "lucide-react"

interface ProfileHeaderProps {
  name: string
  bnsName: string
  bio: string
  keyPrice: string
  keysInCirculation: number
  marketCap: string
  avatarUrl?: string
}

export function ProfileHeader({
  name,
  bnsName,
  bio,
  keyPrice,
  keysInCirculation,
  marketCap,
  avatarUrl,
}: ProfileHeaderProps) {
  return (
    <Card className="mb-8">
      <CardContent className="p-8">
        <div className="flex gap-8 mb-8">
          <Avatar className="h-32 w-32">
            <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={name} />
            <AvatarFallback className="text-3xl">{name.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="text-4xl font-bold mb-2">{name}</h2>
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <Bitcoin className="h-4 w-4 text-primary" />
              <span>{bnsName}</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">{bio}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-secondary">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Key Price</div>
              <div className="text-2xl font-bold">{keyPrice}</div>
            </CardContent>
          </Card>

          <Card className="bg-secondary">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Keys in Circulation</div>
              <div className="text-2xl font-bold">{keysInCirculation}</div>
            </CardContent>
          </Card>

          <Card className="bg-secondary">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-1">Market Cap</div>
              <div className="text-2xl font-bold">{marketCap}</div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}
