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
      {/* WCAG 2.4.1 Skip Link */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Sidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          role={role}
          sidebarOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main id="main-content" tabIndex={-1} className="flex-1 mx-auto w-full max-w-[1440px] p-4 md:p-7 lg:p-8 outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}
