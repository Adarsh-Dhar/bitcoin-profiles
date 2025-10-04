'use client'

import { ConnectWalletButton } from '@/components/connect-wallet-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, Send, FileText, ExternalLink } from 'lucide-react'

export default function WalletTestPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leather Wallet Test</h1>
          <p className="text-muted-foreground">
            Test the Leather wallet connection and functionality
          </p>
        </div>

        {/* Wallet Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Wallet Connection
            </CardTitle>
            <CardDescription>
              Connect your Leather wallet to test functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConnectWalletButton />
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Bitcoin
              </CardTitle>
              <CardDescription>
                Test sending Bitcoin through the Leather wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Once connected, you can test sending Bitcoin using the &quot;Send Bitcoin (Test)&quot; button.
                </p>
                <Badge variant="secondary">Test Mode</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sign PSBT
              </CardTitle>
              <CardDescription>
                Test signing a Partially Signed Bitcoin Transaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Once connected, you can test signing PSBTs using the &quot;Sign PSBT (Test)&quot; button.
                </p>
                <Badge variant="secondary">Test Mode</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold">1.</span>
                <p>
                  Install the Leather wallet extension from{' '}
                  <a 
                    href="https://leather.io" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    leather.io <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold">2.</span>
                <p>Click &quot;Connect Leather Wallet&quot; to open the wallet connection popup</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold">3.</span>
                <p>Approve the connection request in the Leather wallet popup</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold">4.</span>
                <p>Once connected, test the Bitcoin sending and PSBT signing functionality</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Wallet Detection:</strong> Checks for <code className="bg-muted px-1 rounded">window.LeatherProvider</code></p>
              <p><strong>Connection Method:</strong> Uses <code className="bg-muted px-1 rounded">getAddresses</code> request</p>
              <p><strong>Send Bitcoin:</strong> Uses <code className="bg-muted px-1 rounded">sendTransfer</code> request</p>
              <p><strong>Sign PSBT:</strong> Uses <code className="bg-muted px-1 rounded">signPsbt</code> request</p>
              <p><strong>Network:</strong> Currently configured for testnet</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
