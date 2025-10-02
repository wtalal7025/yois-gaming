/**
 * Dynamic Game Page
 * Handles individual game routes and loads appropriate game components
 */

import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GamePageWrapper } from './GamePageWrapper'
import { getGameInfo } from '../../../lib/gameRegistry'
import type { GameType } from '@yois-games/shared'

interface GamePageProps {
  params: {
    gameId: string
  }
}

/**
 * Generate static params for all available games
 * Reason: Pre-generate pages for all games for better SEO and performance
 */
export async function generateStaticParams() {
  const gameIds: GameType[] = ['mines', 'sugar-rush', 'bars', 'dragon-tower', 'crash', 'limbo']

  return gameIds.map((gameId) => ({
    gameId,
  }))
}

/**
 * Generate metadata for each game page
 * Reason: SEO optimization with game-specific titles and descriptions
 */
export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const gameInfo = getGameInfo(params.gameId as GameType)

  if (!gameInfo) {
    return {
      title: 'Game Not Found - Yois Gaming Platform',
      description: 'The requested game could not be found.',
    }
  }

  return {
    title: `${gameInfo.title} - Yois Gaming Platform`,
    description: gameInfo.description,
    keywords: [
      gameInfo.title.toLowerCase(),
      gameInfo.category,
      'casino game',
      'provably fair',
      ...gameInfo.features.map(f => f.toLowerCase())
    ].join(', '),
    openGraph: {
      title: `Play ${gameInfo.title} - Yois Gaming Platform`,
      description: gameInfo.description,
      type: 'website',
      url: `/games/${gameInfo.id}`,
      images: [
        {
          url: gameInfo.thumbnail,
          width: 1200,
          height: 630,
          alt: `${gameInfo.title} game thumbnail`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Play ${gameInfo.title} - Yois Gaming Platform`,
      description: gameInfo.description,
      images: [gameInfo.thumbnail],
    },
  }
}

/**
 * Dynamic game page component
 * Reason: Server component that validates game ID and handles metadata
 */
export default function GamePage({ params }: GamePageProps) {
  const gameInfo = getGameInfo(params.gameId as GameType)

  // Return 404 if game doesn't exist
  if (!gameInfo) {
    notFound()
  }

  return <GamePageWrapper gameId={params.gameId as GameType} />
}