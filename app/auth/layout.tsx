export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 md:p-8">
      {/* background accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-10 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-10 bottom-10 h-48 w-48 rounded-full bg-secondary/30 blur-3xl" />
      </div>

      <div className="w-full max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Welcome to Bitcoin Profiles</h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            Sign in to continue or create an account to join the network.
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-lg transition-colors hover:border-primary/50 max-w-xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  )
}


