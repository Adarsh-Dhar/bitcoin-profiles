"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SignupRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to /auth since signup is now handled there
    router.replace("/auth")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Redirecting...</h2>
        <p className="text-muted-foreground">Taking you to the signup page.</p>
      </div>
    </div>
  )
}
