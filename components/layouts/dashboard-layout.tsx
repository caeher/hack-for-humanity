'use client'

import React, { useState } from 'react'
import { Role } from '@/lib/cri-data'
import { Sidebar } from './sidebar'
import { Header } from './header'

export interface DashboardLayoutProps {
  role: Role
  children: React.ReactNode
}

export function DashboardLayout({ role, children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          role={role}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 mx-auto w-full max-w-[1440px] p-4 md:p-7 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
