/**
 * Responsive Game Grid Component  
 * Automatically switches between desktop and mobile card layouts based on screen size
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { GameCard } from './GameCard'
import { MobileGameCard } from './MobileGameCard'
import { useResponsive } from '../../hooks/useResponsive'
import type { GameInfo } from '../../lib/gameRegistry'

interface ResponsiveGameGridProps {
  games: GameInfo[]
  className?: string
  isLoading?: boolean
  variant?: 'full' | 'compact'
}

/**
 * Loading skeleton for game cards that adapts to screen size
 */
function ResponsiveGameCardSkeleton({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <div className="bg-default-100 rounded-lg animate-pulse p-3">
        <div className="flex space-x-3">
          <div className="w-16 h-16 bg-default-200 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-default-200 rounded w-24" />
            <div className="h-3 bg-default-200 rounded w-16" />
            <div className="h-8 bg-primary/20 rounded w-full" />
          </div>
        </div>
      </div>
    )
  }

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
        <div className="h-10 bg-primary/20 rounded" />
      </div>
    </div>
  )
}

/**
 * Empty state that adapts to screen size
 */
function ResponsiveEmptyState({ isMobile }: { isMobile: boolean }) {
  return (
    <div className={`col-span-full flex flex-col items-center justify-center ${isMobile ? 'py-8' : 'py-12'} px-4 text-center`}>
      <div className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-default-100 rounded-full flex items-center justify-center mb-4`}>
        <svg
          className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-default-400`}
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
      <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-foreground mb-2`}>
        No games found
      </h3>
      <p className={`text-foreground-600 ${isMobile ? 'text-sm' : 'text-base'} max-w-sm`}>
        Try adjusting your search or filter criteria to find the games you&apos;re looking for.
      </p>
    </div>
  )
}

export function ResponsiveGameGrid({
  games,
  className = '',
  isLoading = false,
  variant = 'full'
}: ResponsiveGameGridProps) {
  const { isMobile, currentBreakpoint } = useResponsive()

  // Get responsive grid classes
  const getGridClasses = () => {
    if (variant === 'compact') {
      return isMobile
        ? 'grid grid-cols-1 gap-3'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
    }

    return isMobile
      ? 'grid grid-cols-1 gap-4'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
  }

  // Animation variants for staggered appearance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: isMobile ? 0.05 : 0.1,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: isMobile ? 10 : 20,
      scale: isMobile ? 1 : 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: isMobile ? 0.2 : 0.4,
        ease: "easeOut"
      }
    }
  }

  if (isLoading) {
    const skeletonCount = isMobile ? 4 : 8
    return (
      <div className={`${getGridClasses()} ${className}`}>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <ResponsiveGameCardSkeleton key={index} isMobile={isMobile} />
        ))}
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className={`grid grid-cols-1 ${className}`}>
        <ResponsiveEmptyState isMobile={isMobile} />
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`${getGridClasses()} ${className}`}
    >
      {games.map((game, index) => (
        <motion.div
          key={game.id}
          variants={itemVariants}
          className="h-full"
        >
          {isMobile ? (
            <MobileGameCard
              game={game}
              variant={variant === 'compact' ? 'compact' : 'full'}
            />
          ) : (
            <GameCard
              game={game}
              priority={index < 4} // Prioritize first 4 images for loading
            />
          )}
        </motion.div>
      ))}
    </motion.div>
  )
}

/**
 * Compact responsive grid for smaller sections
 */
export function CompactResponsiveGameGrid({
  games,
  className = '',
  isLoading = false
}: Omit<ResponsiveGameGridProps, 'variant'>) {
  return (
    <ResponsiveGameGrid
      games={games}
      className={className}
      isLoading={isLoading}
      variant="compact"
    />
  )
}