import './globals.css'
import type { Metadata } from 'next'
import { IBM_Plex_Sans } from 'next/font/google'
import ThemeToggle from '@/components/ThemeToggle'

const plex = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400','500','700'] })

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_NAME || 'RAG Client',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plex.className}`}>

        <div className="mx-auto max-w-3xl min-h-screen px-4">
          <header className="sticky top-0 z-10 py-4 backdrop-blur flex items-center justify-end">
            <ThemeToggle />
          </header>

          {children}
        </div>

      </body>
    </html>
  )
}
