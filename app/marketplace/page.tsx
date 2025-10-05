import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function MarketplacePage() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Create marketplace</h1>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="h-full">
          <CardContent className="p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Primary marketplace</h2>
              <p className="text-muted-foreground mt-1">
                The main marketplace where keys are initially issued and priced. Ideal for first sales.
              </p>
            </div>
            <div className="flex-1" />
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Type: Primary</div>
              <Link href="/marketplace/create?type=primary">
                <Button>Create primary marketplace</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardContent className="p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Secondary marketplace</h2>
              <p className="text-muted-foreground mt-1">
                A peer-to-peer market for reselling previously issued keys. Great for liquidity.
              </p>
            </div>
            <div className="flex-1" />
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Type: Secondary</div>
              <Link href="/marketplace/create?type=secondary">
                <Button variant="secondary">Create secondary marketplace</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


