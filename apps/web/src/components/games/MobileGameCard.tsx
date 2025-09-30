/**
 * Mobile-Optimized Game Card Component
 * Touch-friendly game card designed specifically for mobile devices
 */

'use client'

import React from 'react'
import { Card, CardBody, Button, Chip } from '@heroui/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import type { GameInfo } from '../../lib/gameRegistry'
import { FavoriteButton } from './FavoriteButton'
import { useGamePreferencesStore } from '../../stores/gamePreferences'

interface MobileGameCardProps {
  game: GameInfo
  className?: string
  variant?: 'compact' | 'full'
}

export function MobileGameCard({ 
  game, 
  className = '', 
  variant = 'compact' 
}: MobileGameCardProps) {
  const { addRecentGame } = useGamePreferencesStore()

  // Format player count for mobile display
  const formatPlayerCount = (count: number = 0) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }

  // Handle game play - track in recent games
  const handlePlayGame = () => {
    addRecentGame(game.id)
  }

  if (variant === 'compact') {
    return (
      <motion.div
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className={className}
      >
        <Card 
          className="h-full bg-gradient-to-br from-background to-default-100 border-1 border-default-200 active:border-primary-300"
          isPressable
        >
          <CardBody className="p-3">
            <div className="flex space-x-3">
              {/* Game Thumbnail */}
              <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={game.thumbnail}
                  alt={`${game.title} thumbnail`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
                
                {/* Status badges */}
                <div className="absolute -top-1 -right-1">
                  {game.isNew && (
                    <div className="w-3 h-3 bg-primary rounded-full border border-background"></div>
                  )}
                  {game.isPopular && !game.isNew && (
                    <div className="w-3 h-3 bg-success rounded-full border border-background"></div>
                  )}
                </div>
              </div>

              {/* Game Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-sm text-foreground truncate pr-2">
                    {game.title}
                  </h3>
                  <FavoriteButton gameId={game.id} size="sm" variant="icon" />
                </div>

                <div className="flex items-center space-x-2 mb-2">
                  <Chip size="sm" variant="flat" className="text-xs capitalize">
                    {game.category}
                  </Chip>
                  <span className="text-xs text-foreground-500">
                    {formatPlayerCount(game.playerCount || 0)} playing
                  </span>
                </div>

                <Link href={`/games/${game.id}`} onClick={handlePlayGame}>
                  <Button 
                    size="sm" 
                    color="primary" 
                    variant="solid"
                    className="w-full h-8 text-xs font-medium"
                  >
                    Play
                  </Button>
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    )
  }

  // Full variant for larger mobile cards
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className={className}
    >
      <Card 
        className="h-full bg-gradient-to-br from-background to-default-100 border-1 border-default-200 active:border-primary-300"
        isPressable
      >
        <CardBody className="p-0">
          <div className="relative">
            {/* Game Thumbnail */}
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={game.thumbnail}
                alt={`${game.title} thumbnail`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              
              {/* Status badges */}
              <div className="absolute top-2 left-2 flex gap-1">
                {game.isNew && (
                  <Chip size="sm" color="primary" variant="solid">
                    NEW
                  </Chip>
                )}
                {game.isPopular && (
                  <Chip size="sm" color="success" variant="solid">
                    HOT
                  </Chip>
                )}
              </div>

              {/* Favorite button */}
              <div className="absolute top-2 right-2">
                <FavoriteButton 
                  gameId={game.id} 
                  size="sm" 
                  className="bg-background/80 backdrop-blur-sm" 
                />
              </div>

              {/* Touch overlay for better tap area */}
              <Link href={`/games/${game.id}`} onClick={handlePlayGame}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </Link>
            </div>

            {/* Game Information */}
            <div className="p-3">
              {/* Title and Category */}
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-base font-bold text-foreground">
                  {game.title}
                </h3>
                <Chip
                  size="sm"
                  variant="flat"
                  className="capitalize text-xs"
                >
                  {game.category}
                </Chip>
              </div>

              {/* Stats */}
              <div className="flex justify-between items-center text-xs text-foreground-500 mb-3">
                <span>{formatPlayerCount(game.playerCount || 0)} playing</span>
                <span>RTP {game.rtp}%</span>
              </div>

              {/* Play Button */}
              <Link href={`/games/${game.id}`} onClick={handlePlayGame}>
                <Button 
                  color="primary" 
                  variant="solid" 
                  className="w-full font-semibold h-10 text-sm"
                  size="md"
                >
                  Play Now
                </Button>
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )
}