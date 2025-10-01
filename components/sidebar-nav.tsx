"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Compass, Briefcase, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 border-r border-border bg-card">
      <div className="flex flex-col gap-2 p-4 pt-20">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
