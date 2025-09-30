/**
 * GameGrid Component
 * Responsive grid layout for displaying game cards
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { GameCard } from './GameCard'
import type { GameInfo } from '../../lib/gameRegistry'

/**
 * Props for GameGrid component
 */
interface GameGridProps {
  games: GameInfo[]
  className?: string
  isLoading?: boolean
}

/**
 * Loading skeleton for game cards
 */
function GameCardSkeleton() {
  return (
    <div className="bg-default-100 rounded-lg animate-pulse">
      <div className="aspect-video bg-default-200 rounded-t-lg" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between">
          <div className="h-6 bg-default-200 rounded w-24" />
          <div className="h-4 bg-default-200 rounded w-12" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-default-200 rounded w-full" />
          <div className="h-4 bg-default-200 rounded w-3/4" />
        </div>
        <div className="flex justify-between">
          <div className="h-3 bg-default-200 rounded w-20" />
          <div className="h-3 bg-default-200 rounded w-16" />
        </div>
        <div className="h-10 bg-primary/20 rounded" />
      </div>
    </div>
  )
}

/**
 * Empty state component when no games match filters
 */
function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-default-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-default-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No games found
      </h3>
      <p className="text-foreground-600 max-w-sm">
        Try adjusting your search or filter criteria to find the games you're looking for.
      </p>
    </div>
  )
}

/**
 * GameGrid component for responsive game card layout
 * Reason: Provides consistent, responsive grid layout for game cards with loading states
 */
export function GameGrid({ games, className = '', isLoading = false }: GameGridProps) {
  // Animation variants for staggered card appearance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  }

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
        {Array.from({ length: 8 }, (_, index) => (
          <GameCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className={`grid grid-cols-1 ${className}`}>
        <EmptyState />
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}
    >
      {games.map((game, index) => (
        <motion.div
          key={game.id}
          variants={cardVariants}
          className="h-full"
        >
          <GameCard 
            game={game} 
            priority={index < 4} // Prioritize first 4 images for loading
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

/**
 * Compact GameGrid for smaller sections (e.g., popular games)
 */
export function CompactGameGrid({ games, className = '', isLoading = false }: GameGridProps) {
  if (isLoading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 ${className}`}>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="bg-default-100 rounded-lg animate-pulse aspect-square" />
        ))}
      </div>
    )
  }

  if (games.length === 0) {
    return null
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 ${className}`}>
      {games.map((game) => (
        <motion.div
          key={game.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-default-100 to-default-200 cursor-pointer group"
        >
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
          <div className="absolute bottom-2 left-2 right-2">
            <h4 className="text-sm font-semibold text-white drop-shadow-lg">
              {game.title}
            </h4>
            <p className="text-xs text-white/80 drop-shadow">
              {game.category}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}