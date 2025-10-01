import { Lock, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const messages = [
  {
    id: 1,
    username: "satoshi.btc",
    content: "Welcome to the chat! Excited to connect with all key holders.",
    timestamp: "5 min ago",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 2,
    username: "hal.btc",
    content: "This is amazing! Love the concept.",
    timestamp: "3 min ago",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 3,
    username: "vitalik.btc",
    content: "Great to be part of this community.",
    timestamp: "1 min ago",
    avatar: "/placeholder.svg?height=40&width=40",
  },
]

export function ChatInterface() {
  return (
    <div className="flex flex-col h-[600px] rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 p-4 bg-primary/10 border-b border-border rounded-t-lg">
        <Lock className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">You must own at least 1 Key to participate in this chat.</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={message.avatar || "/placeholder.svg"} alt={message.username} />
              <AvatarFallback>{message.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold">{message.username}</span>
                <span className="text-xs text-muted-foreground">{message.timestamp}</span>
              </div>
              <p className="text-sm leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <form className="flex gap-2">
          <Input placeholder="Type your message..." className="flex-1" />
          <Button size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
