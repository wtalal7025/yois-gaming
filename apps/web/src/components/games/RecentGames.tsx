/**
 * Recent Games Component
 * Displays user's recently played games with quick access
 */

'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardBody, Button, Chip } from '@heroui/react'
import { motion } from 'framer-motion'
import { useRecentGames } from '../../stores/gamePreferences'
import { getGameInfo } from '../../lib/gameRegistry'

interface RecentGamesProps {
  maxGames?: number
  variant?: 'compact' | 'detailed'
  className?: string
}

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.7L16.2,16.2Z"/>
  </svg>
)

export function RecentGames({ 
  maxGames = 5, 
  variant = 'compact', 
  className = '' 
}: RecentGamesProps) {
  const { recentGames, clearRecentGames } = useRecentGames()
  
  // Get recent games with full game info
  const recentGamesWithInfo = recentGames
    .slice(0, maxGames)
    .map(recentGame => ({
      ...recentGame,
      gameInfo: getGameInfo(recentGame.gameId)
    }))
    .filter(item => item.gameInfo) // Remove any games that don't exist in registry

  // Format last played time
  const formatLastPlayed = (lastPlayed: string) => {
    const date = new Date(lastPlayed)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  if (recentGamesWithInfo.length === 0) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <CardBody>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center">
              <ClockIcon />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">No Recent Games</h3>
              <p className="text-muted-foreground mb-4">
                Start playing some games to see them here!
              </p>
              <Link href="/games">
                <Button color="primary">Browse Games</Button>
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  if (variant === 'compact') {
    return (
      <Card className={className}>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClockIcon />
            <h3 className="font-semibold">Recent Games</h3>
          </div>
          {recentGames.length > 0 && (
            <Button
              size="sm"
              variant="light"
              color="danger"
              onPress={clearRecentGames}
            >
              Clear All
            </Button>
          )}
        </CardHeader>
        <CardBody className="space-y-3">
          {recentGamesWithInfo.map((item, index) => (
            <motion.div
              key={item.gameId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/games/${item.gameId}`}>
                <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {item.gameInfo!.title.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item.gameInfo!.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatLastPlayed(item.lastPlayed)} • {item.sessionCount} sessions
                    </div>
                  </div>
                  <Chip size="sm" variant="flat">
                    {item.gameInfo!.category}
                  </Chip>
                </div>
              </Link>
            </motion.div>
          ))}
        </CardBody>
      </Card>
    )
  }

  // Detailed variant
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ClockIcon />
          <h3 className="font-semibold text-xl">Recently Played</h3>
        </div>
        {recentGames.length > 0 && (
          <Button
            size="sm"
            variant="light"
            color="danger"
            onPress={clearRecentGames}
          >
            Clear All
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recentGamesWithInfo.map((item, index) => (
          <motion.div
            key={item.gameId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:scale-105 transition-transform cursor-pointer">
              <Link href={`/games/${item.gameId}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between w-full">
                    <div>
                      <h4 className="font-semibold">{item.gameInfo!.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.gameInfo!.description.slice(0, 60)}...
                      </p>
                    </div>
                    <Chip size="sm" variant="flat" color="primary">
                      {item.gameInfo!.category}
                    </Chip>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Last played {formatLastPlayed(item.lastPlayed)}</span>
                    <span>{item.sessionCount} sessions</span>
                  </div>
                </CardBody>
              </Link>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}