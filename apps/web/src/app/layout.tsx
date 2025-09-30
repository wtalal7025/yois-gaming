import type { Metadata } from 'next'
import { Inter, Orbitron } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Yois Gaming - Gaming Platform',
  description: 'Experience thrilling games with provably fair outcomes. Play Sugar Rush, Mines, Bars, Dragon Tower, Crash, and Limbo with provably fair technology.',
  keywords: 'gaming, casino, provably fair, crash game, mines, slots, dice, betting',
  authors: [{ name: 'Yois Gaming' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Yois Gaming - Gaming Platform',
    description: 'Experience thrilling games with provably fair outcomes',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yois Gaming - Gaming Platform',
    description: 'Experience thrilling games with provably fair outcomes',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#00E6CC',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${orbitron.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
        suppressHydrationWarning
      >
        <Providers>
          <div id="root" className="relative flex min-h-screen flex-col">
            <main className="flex-1">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}