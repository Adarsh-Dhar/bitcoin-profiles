'use client';

import { useState, useEffect } from 'react';
import { useFactoryContract } from '@/hooks/useFactoryContract';
import { useDynamicKeyTokenContract } from '@/hooks/useDynamicKeyTokenContract';
import { useKeyVendingMachineContract } from '@/hooks/useKeyVendingMachineContract';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ChatRoomTokenManagerProps {
  chatRoomId: number;
  creatorAddress: string;
}

interface ChatRoomTokenInfo {
  contractAddress?: string;
  contractName?: string;
  name?: string;
  symbol?: string;
  totalSupply?: bigint;
  userBalance?: bigint;
  chatRoomId?: bigint;
}

export function ChatRoomTokenManager({ chatRoomId, creatorAddress }: ChatRoomTokenManagerProps) {
  const [tokenInfo, setTokenInfo] = useState<ChatRoomTokenInfo>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [buyAmount, setBuyAmount] = useState('1');
  const [maxPrice, setMaxPrice] = useState('1000000'); // 0.01 sBTC in satoshis

  const factory = useFactoryContract();
  const vendingMachine = useKeyVendingMachineContract();
  const keyToken = useDynamicKeyTokenContract(tokenInfo.contractAddress, tokenInfo.contractName);

  // Load chat room token information
  const loadTokenInfo = async () => {
    try {
      setIsLoading(true);
      const market = await factory.getMarketDecoded(String(chatRoomId));
      const tokenContract = market?.tokenContract as string | undefined;
      
      if (tokenContract && typeof tokenContract === 'string') {
        // Parse contract address and name from the contract principal
        const [address, name] = tokenContract.split('.');
        
        setTokenInfo({
          contractAddress: address,
          contractName: name,
          name: 'Chat Room Keys',
          symbol: 'KEYS',
          chatRoomId: BigInt(chatRoomId),
        });

        // Load token details
        try {
          const [totalSupply, userBalance] = await Promise.all([
            keyToken.getTotalSupplyDecoded(),
            keyToken.getBalanceDecoded(creatorAddress),
          ]);

          setTokenInfo(prev => ({
            ...prev,
            totalSupply,
            userBalance,
          }));
        } catch (error) {
          console.warn('Failed to load token details:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load token info:', error);
      toast.error('Failed to load token information');
    } finally {
      setIsLoading(false);
    }
  };

  // Create chat room token flow removed in v6 (handled via Factory UI)

  // Buy keys
  const buyKeys = async () => {
    try {
      setIsBuying(true);
      const amount = BigInt(buyAmount);
      const maxPriceValue = BigInt(maxPrice);
      const tokenId = tokenInfo.contractAddress && tokenInfo.contractName
        ? `${tokenInfo.contractAddress}.${tokenInfo.contractName}`
        : undefined;
      if (!tokenId) throw new Error('Token contract not available');

      // Use v6 signature which requires the token principal
      await vendingMachine.buyKeysWithToken(amount, maxPriceValue, tokenId);
      toast.success(`Bought ${buyAmount} keys!`);
      
      // Reload token info after purchase
      setTimeout(loadTokenInfo, 2000);
    } catch (error) {
      console.error('Failed to buy keys:', error);
      toast.error('Failed to buy keys');
    } finally {
      setIsBuying(false);
    }
  };

  // Load token info on mount and when chat room ID changes
  useEffect(() => {
    loadTokenInfo();
  }, [chatRoomId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chat Room Token</CardTitle>
          <CardDescription>Loading token information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tokenInfo.contractAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chat Room Token</CardTitle>
          <CardDescription>No token exists for this chat room yet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Create a unique token for this chat room to enable key trading.
          </p>
          <Button disabled className="w-full">
            Coming soon
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {tokenInfo.name}
          <Badge variant="secondary">{tokenInfo.symbol}</Badge>
        </CardTitle>
        <CardDescription>
          Chat Room {tokenInfo.chatRoomId?.toString()} Token
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Total Supply</Label>
            <p className="text-2xl font-bold">
              {tokenInfo.totalSupply?.toString() || '0'}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium">Your Balance</Label>
            <p className="text-2xl font-bold">
              {tokenInfo.userBalance?.toString() || '0'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="buyAmount">Amount to Buy</Label>
            <Input
              id="buyAmount"
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              min="1"
              placeholder="1"
            />
          </div>
          <div>
            <Label htmlFor="maxPrice">Max Price (sats)</Label>
            <Input
              id="maxPrice"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              min="1000000"
              placeholder="1000000"
            />
          </div>
          <Button 
            onClick={buyKeys} 
            disabled={isBuying || !buyAmount || !maxPrice}
            className="w-full"
          >
            {isBuying ? 'Buying...' : `Buy ${buyAmount} Keys`}
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          <p>Contract: {tokenInfo.contractAddress}.{tokenInfo.contractName}</p>
        </div>
      </CardContent>
    </Card>
  );
}
