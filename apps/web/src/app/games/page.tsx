/**
 * Games Lobby Page
 * Main page displaying all available games with filtering and search
 */

import { Metadata } from 'next'
import { GamesLobby } from './GamesLobby'

export const metadata: Metadata = {
  title: 'Games - Yois Gaming Platform',
  description: 'Discover and play exciting casino games including Mines, Sugar Rush, Bars, Dragon Tower, Crash, and Limbo. All games feature provably fair technology.',
  keywords: 'casino games, mines, sugar rush, bars, dragon tower, crash, limbo, provably fair, online gaming',
  openGraph: {
    title: 'Games - Yois Gaming Platform',
    description: 'Discover and play exciting casino games with provably fair technology.',
    type: 'website',
    url: '/games',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Games - Yois Gaming Platform',
    description: 'Discover and play exciting casino games with provably fair technology.',
  },
}

/**
 * Main games lobby page component
 * Reason: Server component that handles metadata and delegates to client component
 */
export default function GamesPage() {
  return <GamesLobby />
}