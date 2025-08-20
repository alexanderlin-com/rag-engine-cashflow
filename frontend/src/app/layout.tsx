import './globals.css'
import type { Metadata } from 'next'
import { IBM_Plex_Sans } from 'next/font/google'
import ThemeToggle from '@/components/ThemeToggle'

const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '700'] })

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_NAME || 'RAG Client',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plex.className}`}>
        {/*
          HERE'S THE FIX:
          We're adding `bg-background` to this div. Now the container that holds
          your page content has its own solid background, not relying on the body.
        */}
        <div className="mx-auto max-w-3xl min-h-screen px-4 bg-background">
          <header className="sticky top-0 z-10 py-4 backdrop-blur flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">
              {process.env.NEXT_PUBLIC_SITE_NAME || 'Cashflow Depot RAG'}
            </h1>
            <ThemeToggle />
          </header>

          {children}
        </div>
      </body>
    </html>
  )
}