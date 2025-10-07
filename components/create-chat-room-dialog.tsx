'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, MessageCircle, Users, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useFactoryContract } from '@/hooks/useFactoryContract'

interface CreateChatRoomDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onChatRoomCreated: (chatRoom: any) => void
  userAddress: string
}

export function CreateChatRoomDialog({
  isOpen,
  onOpenChange,
  onChatRoomCreated,
  userAddress
}: CreateChatRoomDialogProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isRegisteringMarket, setIsRegisteringMarket] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: false
  })
  const factory = useFactoryContract()

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Chat room name is required')
      return
    }

    if (!userAddress) {
      toast.error('Please connect your wallet first')
      window.location.href = '/auth'
      return
    }

    try {
      setIsCreating(true)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          walletAddress: userAddress,
          name: formData.name.trim(),
          description: formData.description.trim(),
          isPrivate: formData.isPrivate
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // If user not found, redirect to auth page
        if (errorData.error === 'User not found') {
          toast.error('Please create an account first')
          window.location.href = '/auth'
          return
        }
        
        throw new Error(errorData.error || 'Failed to create chat room')
      }

      const data = await response.json()
      
      // Register market with Factory contract
      try {
        setIsRegisteringMarket(true)
        toast.info('Registering market...')
        
        console.log('Market registration data from API:', data.marketRegistrationData)
        
        await factory.registerMarket(
          data.marketRegistrationData.chatRoomId,
          data.marketRegistrationData.vendingMachine,
          data.marketRegistrationData.tokenContract,
          data.marketRegistrationData.creator
        )
        
        toast.success('Chat room and market registered successfully!')
      } catch (marketError) {
        console.error('Error registering market:', marketError)
        
        // Check if it's because the contracts are already registered
        if (marketError instanceof Error && marketError.message.includes('already-exists')) {
          toast.warning('Chat room created! Market registration skipped (contracts already registered).')
        } else {
          toast.error('Chat room created but market registration failed. You may need to register manually.')
        }
      } finally {
        setIsRegisteringMarket(false)
      }
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        isPrivate: false
      })
      
      // Close dialog
      onOpenChange(false)
      
      // Notify parent component
      onChatRoomCreated(data.chatRoom)
    } catch (error) {
      console.error('Error creating chat room:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create chat room')
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating && !isRegisteringMarket) {
      setFormData({
        name: '',
        description: '',
        isPrivate: false
      })
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Create New Chat Room
          </DialogTitle>
          <DialogDescription>
            Create an exclusive chat room for your community. You'll be the admin and can invite others to join.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Chat Room Name *
              </Label>
              <Input
                id="name"
                placeholder="Enter chat room name..."
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isCreating}
                maxLength={50}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {formData.name.length}/50 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Describe what this chat room is about..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                disabled={isCreating}
                maxLength={200}
                rows={3}
                className="w-full resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/200 characters
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPrivate"
                checked={formData.isPrivate}
                onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
                disabled={isCreating}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isPrivate" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Private Chat Room
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Private chat rooms require approval for new members to join.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || isRegisteringMarket || !formData.name.trim()}
              className="gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : isRegisteringMarket ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registering Market...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  Create Chat Room
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
