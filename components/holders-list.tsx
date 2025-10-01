import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const holders = [
  { rank: 1, username: "satoshi.btc", keysHeld: 25, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 2, username: "hal.btc", keysHeld: 18, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 3, username: "vitalik.btc", keysHeld: 12, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 4, username: "cz.btc", keysHeld: 10, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 5, username: "saylor.btc", keysHeld: 8, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 6, username: "jack.btc", keysHeld: 7, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 7, username: "elon.btc", keysHeld: 5, avatar: "/placeholder.svg?height=40&width=40" },
  { rank: 8, username: "cathie.btc", keysHeld: 4, avatar: "/placeholder.svg?height=40&width=40" },
]

export function HoldersList() {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Rank</TableHead>
            <TableHead>Holder</TableHead>
            <TableHead className="text-right">Keys Held</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holders.map((holder) => (
            <TableRow key={holder.rank}>
              <TableCell className="font-medium">#{holder.rank}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={holder.avatar || "/placeholder.svg"} alt={holder.username} />
                    <AvatarFallback>{holder.username.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>{holder.username}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold">{holder.keysHeld}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
