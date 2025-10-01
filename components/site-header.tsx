"use client"

import { Search, Wallet } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { appkit } from "@/app/provider"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-8 gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-full" />
          <span className="text-xl font-bold">Bitcoin Profiles</span>
        </div>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search profiles..." className="pl-10" />
        </div>

        <Button className="ml-auto" onClick={() => appkit.open()}>
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
      </div>
    </header>
  )
}
