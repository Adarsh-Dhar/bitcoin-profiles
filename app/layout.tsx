import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SidebarNav } from "@/components/sidebar-nav"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import ContextProvider from "@/app/provider"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Bitcoin Profiles - SocialFi Platform",
  description: "Buy and sell Keys to access exclusive chat rooms",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ContextProvider>
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
          </ContextProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
