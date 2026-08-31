import { Geist_Mono, Inter } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import { ConvexClientProvider } from '@/components/providers/convex-client-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: { default: 'CRI — Recovery Intelligence', template: '%s | CRI' },
  description: 'A coordinated recovery workspace for patients, caregivers, and clinical teams.',
}

export const viewport: Viewport = { themeColor: '#f8f7f5', colorScheme: 'light', userScalable: true }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased`}>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  )
}
