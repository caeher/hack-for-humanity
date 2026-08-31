import React from 'react'
import Link from 'next/link'
import { Activity } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="paper-grid flex min-h-screen flex-col justify-between bg-background px-4 py-8">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-foreground font-bold text-background">
            C
          </span>
          <div>
            <strong className="block leading-none text-foreground">CRI</strong>
            <span className="text-xs text-muted-foreground">Recovery intelligence</span>
          </div>
        </Link>
      </header>

      <main className="flex w-full flex-1 items-center justify-center py-10">
        {children}
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
        <p>CRI prototype · Care Recovery Intelligence</p>
        <p className="flex items-center gap-2">
          <Activity className="size-3" /> Secure patient & clinician authentication
        </p>
      </footer>
    </div>
  )
}
