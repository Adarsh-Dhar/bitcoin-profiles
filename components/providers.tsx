'use client'

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { ErrorBoundary } from "@/components/error-boundary"
import { SidebarNav } from "@/components/sidebar-nav"
import { SiteHeader } from "@/components/site-header"
import { setupGlobalErrorSuppression } from "@/lib/error-suppression"
import { useEffect } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize error suppression early
  useEffect(() => {
    setupGlobalErrorSuppression()
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <ErrorBoundary>
        <div className="flex min-h-screen">
          <SidebarNav />
          <div className="flex-1 flex flex-col ml-60">
            <SiteHeader />
            <main className="flex-1 p-8">
              <div className="max-w-[1400px] mx-auto">{children}</div>
            </main>
          </div>
        </div>
        <SonnerToaster richColors position="top-right" />
      </ErrorBoundary>
    </ThemeProvider>
  )
}
