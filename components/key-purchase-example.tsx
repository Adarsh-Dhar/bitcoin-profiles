"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { useMarketOperations } from "@/hooks/useMarketOperations"

interface KeyPurchaseExampleProps {
  defaultChatRoomId?: string
  defaultAmount?: number
}

export function KeyPurchaseExample({ 
  defaultChatRoomId = "gaming-lounge", 
  defaultAmount = 10 
}: KeyPurchaseExampleProps) {
  const [chatRoomId, setChatRoomId] = useState(defaultChatRoomId)
  const [amount, setAmount] = useState(defaultAmount)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3 | null>(null)
  const [marketData, setMarketData] = useState<any>(null)
  const [price, setPrice] = useState<bigint | null>(null)
  const [result, setResult] = useState<any>(null)

  const { 
    getMarketForChatRoom, 
    calculateBuyPrice, 
    buyKeysForChatRoom,
    buyKeysWithFullProcess 
  } = useMarketOperations()

  const resetState = () => {
    setStep(null)
    setMarketData(null)
    setPrice(null)
    setResult(null)
  }

  // Step 1: Look up the market for your chat room ID
  const handleStep1 = async () => {
    try {
      setIsLoading(true)
      setStep(1)
      resetState()

      console.log(`Step 1: Looking up market for chat room: ${chatRoomId}`)
      const market = await getMarketForChatRoom(chatRoomId)
      
      setMarketData(market)
      toast.success("Market found successfully!")
      console.log("Market data:", market)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`Step 1 failed: ${errorMessage}`)
      console.error("Step 1 error:", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Step 2: Check the price before buying
  const handleStep2 = async () => {
    try {
      if (!marketData) {
        toast.error("Please complete Step 1 first")
        return
      }

      setIsLoading(true)
      setStep(2)

      console.log(`Step 2: Calculating price for ${amount} keys`)
      const calculatedPrice = await calculateBuyPrice(marketData.vendingMachine, amount)
      
      setPrice(calculatedPrice)
      toast.success(`Price calculated: ${(Number(calculatedPrice) / 1000000).toFixed(6)} STX`)
      console.log("Calculated price:", calculatedPrice)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`Step 2 failed: ${errorMessage}`)
      console.error("Step 2 error:", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Step 3: Buy the keys
  const handleStep3 = async () => {
    try {
      if (!marketData || !price) {
        toast.error("Please complete Steps 1 and 2 first")
        return
      }

      setIsLoading(true)
      setStep(3)

      console.log(`Step 3: Buying ${amount} keys for ${chatRoomId}`)
      const buyResult = await buyKeysForChatRoom(chatRoomId, amount)
      
      setResult(buyResult)
      
      if (buyResult.success) {
        toast.success("Keys purchased successfully!")
        console.log("Purchase result:", buyResult)
      } else {
        toast.error(`Purchase failed: ${buyResult.error}`)
        console.error("Purchase failed:", buyResult.error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`Step 3 failed: ${errorMessage}`)
      console.error("Step 3 error:", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Complete 3-step process in one go
  const handleCompleteProcess = async () => {
    try {
      setIsLoading(true)
      resetState()

      console.log(`Starting complete 3-step process for ${chatRoomId}`)
      const result = await buyKeysWithFullProcess(chatRoomId, amount)
      
      setResult(result)
      
      if (result.success) {
        toast.success("Complete process completed successfully!")
        console.log("Complete process result:", result)
      } else {
        toast.error(`Complete process failed: ${result.error}`)
        console.error("Complete process failed:", result.error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`Complete process failed: ${errorMessage}`)
      console.error("Complete process error:", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔑 Key Token Purchase - 3-Step Process
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chatRoomId">Chat Room ID</Label>
              <Input
                id="chatRoomId"
                value={chatRoomId}
                onChange={(e) => setChatRoomId(e.target.value)}
                placeholder="e.g., gaming-lounge"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="e.g., 10"
                min="1"
              />
            </div>
          </div>

          {/* Step-by-Step Process */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Step-by-Step Process</h3>
            
            {/* Step 1 */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 1 ? 'bg-blue-500 text-white' : 
                  marketData ? 'bg-green-500 text-white' : 'bg-gray-200'
                }`}>
                  {marketData ? <CheckCircle className="h-4 w-4" /> : '1'}
                </div>
                <div>
                  <div className="font-medium">Look up market for chat room</div>
                  <div className="text-sm text-muted-foreground">
                    const market = await getMarketForChatRoom('{chatRoomId}');
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleStep1} 
                disabled={isLoading}
                variant={marketData ? "outline" : "default"}
              >
                {isLoading && step === 1 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : marketData ? (
                  "Completed"
                ) : (
                  "Execute Step 1"
                )}
              </Button>
            </div>

            {/* Step 2 */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 2 ? 'bg-blue-500 text-white' : 
                  price ? 'bg-green-500 text-white' : 'bg-gray-200'
                }`}>
                  {price ? <CheckCircle className="h-4 w-4" /> : '2'}
                </div>
                <div>
                  <div className="font-medium">Check the price before buying</div>
                  <div className="text-sm text-muted-foreground">
                    const price = await calculateBuyPrice(market.vendingMachine, {amount});
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleStep2} 
                disabled={isLoading || !marketData}
                variant={price ? "outline" : "default"}
              >
                {isLoading && step === 2 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : price ? (
                  "Completed"
                ) : (
                  "Execute Step 2"
                )}
              </Button>
            </div>

            {/* Step 3 */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 3 ? 'bg-blue-500 text-white' : 
                  result?.success ? 'bg-green-500 text-white' : 'bg-gray-200'
                }`}>
                  {result?.success ? <CheckCircle className="h-4 w-4" /> : '3'}
                </div>
                <div>
                  <div className="font-medium">Buy the keys</div>
                  <div className="text-sm text-muted-foreground">
                    await buyKeysForChatRoom('{chatRoomId}', {amount}, yourPrivateKey);
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleStep3} 
                disabled={isLoading || !marketData || !price}
                variant={result?.success ? "outline" : "default"}
              >
                {isLoading && step === 3 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : result?.success ? (
                  "Completed"
                ) : (
                  "Execute Step 3"
                )}
              </Button>
            </div>
          </div>

          {/* Complete Process Button */}
          <div className="pt-4 border-t">
            <Button 
              onClick={handleCompleteProcess} 
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Execute Complete 3-Step Process
            </Button>
          </div>

          {/* Results Display */}
          {(marketData || price || result) && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">Results</h3>
              
              {marketData && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Step 1 Result - Market Data</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Vending Machine:</strong> {marketData.vendingMachine}</div>
                    <div><strong>Token Contract:</strong> {marketData.tokenContract}</div>
                    <div><strong>Creator:</strong> {marketData.creator}</div>
                  </div>
                </div>
              )}

              {price && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Step 2 Result - Price Calculation</h4>
                  <div className="space-y-1 text-sm">
                    <div><strong>Price for {amount} keys:</strong> {price.toString()} microSTX</div>
                    <div><strong>Formatted:</strong> {(Number(price) / 1000000).toFixed(6)} STX</div>
                  </div>
                </div>
              )}

              {result && (
                <div className={`p-4 rounded-lg ${
                  result.success ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <h4 className={`font-medium mb-2 ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Step 3 Result - Purchase {result.success ? 'Success' : 'Failed'}
                  </h4>
                  <div className="space-y-1 text-sm">
                    {result.success ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Keys purchased successfully!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span>Error: {result.error}</span>
                      </div>
                    )}
                    {result.transactionId && (
                      <div><strong>Transaction ID:</strong> {result.transactionId}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
