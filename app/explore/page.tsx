import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const allProfiles = Array.from({ length: 20 }, (_, i) => ({
  rank: i + 1,
  username: `user${i + 1}.btc`,
  keyPrice: (0.001 + Math.random() * 0.003).toFixed(4),
  keysInCirculation: Math.floor(50 + Math.random() * 200),
  marketCap: (0.05 + Math.random() * 0.5).toFixed(3),
  avatar: `/placeholder.svg?height=40&width=40`,
}))

export default function ExplorePage() {
  return (
    <div>
      <h1 className="text-5xl font-bold mb-8">Explore Profiles</h1>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by username or BNS name..." className="pl-10" />
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Rank</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Key Price</TableHead>
              <TableHead>Keys in Circulation</TableHead>
              <TableHead>Market Cap</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allProfiles.map((profile) => (
              <TableRow key={profile.rank}>
                <TableCell className="font-medium">#{profile.rank}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar || "/placeholder.svg"} alt={profile.username} />
                      <AvatarFallback>{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{profile.username}</span>
                  </div>
                </TableCell>
                <TableCell className="font-semibold">{profile.keyPrice} BTC</TableCell>
                <TableCell>{profile.keysInCirculation}</TableCell>
                <TableCell className="font-semibold">{profile.marketCap} BTC</TableCell>
                <TableCell className="text-right">
                  <Button size="sm">Trade</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
