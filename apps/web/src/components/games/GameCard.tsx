/**
 * GameCard Component
 * Individual game preview card for the games lobby
 */

'use client'

import React from 'react'
import { Card, CardBody, Button, Chip, Avatar } from '@heroui/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import type { GameInfo } from '../../lib/gameRegistry'
import { FavoriteButton } from './FavoriteButton'

/**
 * Props for GameCard component
 */
interface GameCardProps {
  game: GameInfo
  className?: string
  priority?: boolean // For above-the-fold images
}

/**
 * GameCard component for displaying game information in lobby
 * Reason: Creates consistent, attractive preview cards for each game with key information
 */
export function GameCard({ game, className = '', priority = false }: GameCardProps) {
  // Format player count for display
  const formatPlayerCount = (count: number = 0) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  // Get volatility color
  const getVolatilityColor = (volatility: string) => {
    switch (volatility) {
      case 'low': return 'success'
      case 'medium': return 'warning' 
      case 'high': return 'danger'
      default: return 'default'
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card 
        className="h-full bg-gradient-to-br from-background to-default-100 border-1 border-default-200 hover:border-primary-300 transition-colors duration-300"
        isPressable
        isHoverable
      >
        <CardBody className="p-0">
          <div className="relative">
            {/* Game Thumbnail */}
            <div className="relative aspect-video overflow-hidden">
              <Image
                src={game.thumbnail}
                alt={`${game.title} game thumbnail`}
                fill
                className="object-cover"
                priority={priority}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              
              {/* Status badges overlay */}
              <div className="absolute top-2 left-2 flex gap-1">
                {game.isNew && (
                  <Chip size="sm" color="primary" variant="solid">
                    NEW
                  </Chip>
                )}
                {game.isPopular && (
                  <Chip size="sm" color="success" variant="solid">
                    POPULAR
                  </Chip>
                )}
              </div>

              {/* Category chip and Favorite button */}
              <div className="absolute top-2 right-2 flex gap-2">
                <FavoriteButton gameId={game.id} size="sm" className="bg-background/80 backdrop-blur-sm" />
                <Chip
                  size="sm"
                  variant="flat"
                  className="capitalize bg-background/80 backdrop-blur-sm"
                >
                  {game.category}
                </Chip>
              </div>

              {/* Gradient overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>

            {/* Game Information */}
            <div className="p-4 space-y-3">
              {/* Title and RTP */}
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-foreground font-orbitron">
                  {game.title}
                </h3>
                <div className="text-right">
                  <p className="text-xs text-foreground-600">RTP</p>
                  <p className="text-sm font-semibold text-success">
                    {game.rtp}%
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-foreground-600 line-clamp-2 min-h-[2.5rem]">
                {game.description}
              </p>

              {/* Game Stats */}
              <div className="flex justify-between items-center text-xs text-foreground-500">
                <div className="flex items-center gap-1">
                  <Avatar className="w-4 h-4" />
                  <span>{formatPlayerCount(game.playerCount || 0)} playing</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <span>Volatility:</span>
                  <Chip 
                    size="sm" 
                    color={getVolatilityColor(game.volatility)}
                    variant="flat"
                    className="text-xs px-1 h-4"
                  >
                    {game.volatility}
                  </Chip>
                </div>
              </div>

              {/* Bet Range */}
              <div className="flex justify-between items-center text-xs text-foreground-500">
                <div>
                  <span className="text-foreground-600">Min:</span> {formatCurrency(game.minBet)}
                </div>
                <div>
                  <span className="text-foreground-600">Max:</span> {formatCurrency(game.maxBet)}
                </div>
              </div>

              {/* Last Big Win */}
              {game.lastBigWin && (
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-foreground-600">Last Big Win:</span>
                    <span className="text-sm font-bold text-primary">
                      {formatCurrency(game.lastBigWin)}
                    </span>
                  </div>
                </div>
              )}

              {/* Play Button */}
              <Link href={`/games/${game.id}`} className="block">
                <Button 
                  color="primary" 
                  variant="solid" 
                  className="w-full font-semibold"
                  size="md"
                >
                  Play Now
                </Button>
              </Link>

              {/* Features */}
              <div className="flex flex-wrap gap-1">
                {game.features.slice(0, 3).map((feature, index) => (
                  <Chip 
                    key={index}
                    size="sm"
                    variant="flat"
                    className="text-xs bg-default-100 text-foreground-600"
                  >
                    {feature}
                  </Chip>
                ))}
                {game.features.length > 3 && (
                  <Chip 
                    size="sm"
                    variant="flat"
                    className="text-xs bg-default-100 text-foreground-500"
                  >
                    +{game.features.length - 3} more
                  </Chip>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )
}