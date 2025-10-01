import { ProfileHeader } from "@/components/profile-header"
import { KeyPurchaseCard } from "@/components/key-purchase-card"
import { ChatInterface } from "@/components/chat-interface"
import { HoldersList } from "@/components/holders-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ProfilePage({ params }: { params: { id: string } }) {
  return (
    <div>
      <ProfileHeader
        name="Satoshi Nakamoto"
        bnsName="satoshi.btc"
        bio="Creator of Bitcoin. Passionate about decentralization, cryptography, and building the future of money. Here to connect with the community and share insights."
        keyPrice="0.0025 BTC"
        keysInCirculation={150}
        marketCap="0.375 BTC"
        avatarUrl="/placeholder.svg?height=128&width=128"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <KeyPurchaseCard pricePerKey={0.0025} priceUsd={165.0} />
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="holders">Holders</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="mt-6">
              <ChatInterface />
            </TabsContent>
            <TabsContent value="holders" className="mt-6">
              <HoldersList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
