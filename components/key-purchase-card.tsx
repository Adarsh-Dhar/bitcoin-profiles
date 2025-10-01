"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface KeyPurchaseCardProps {
  pricePerKey: number
  priceUsd: number
}

export function KeyPurchaseCard({ pricePerKey, priceUsd }: KeyPurchaseCardProps) {
  const [quantity, setQuantity] = useState(1)

  const subtotal = pricePerKey * quantity
  const creatorFee = subtotal * 0.05
  const platformFee = subtotal * 0.05
  const total = subtotal + creatorFee + platformFee

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade Keys</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="text-lg font-semibold mb-1">Price per Key: {pricePerKey.toFixed(4)} BTC</div>
          <div className="text-sm text-muted-foreground">${priceUsd.toFixed(2)}</div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
          />
        </div>

        <div className="space-y-2">
          <Button className="w-full" size="lg">
            Buy
          </Button>
          <Button variant="secondary" className="w-full" size="lg">
            Sell
          </Button>
        </div>

        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{subtotal.toFixed(4)} BTC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Creator Fee (5%)</span>
            <span>{creatorFee.toFixed(6)} BTC</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Platform Fee (5%)</span>
            <span>{platformFee.toFixed(6)} BTC</span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total Cost</span>
            <span>{total.toFixed(4)} BTC</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
