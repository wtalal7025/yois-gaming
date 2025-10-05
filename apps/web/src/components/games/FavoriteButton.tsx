/**
 * Favorite Button Component
 * Allows users to mark games as favorites with visual feedback
 */

'use client'

import React from 'react'
import { Button } from '@heroui/react'
import { motion } from 'framer-motion'
import { useFavoriteGames } from '../../stores/gamePreferences'
import type { GameType } from '../../types'

interface FavoriteButtonProps {
  gameId: GameType
  variant?: 'icon' | 'full'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Heart icon components
const HeartIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg
    className="w-5 h-5"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={filled ? 0 : 2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
)

export function FavoriteButton({
  gameId,
  variant = 'icon',
  size = 'md',
  className = ''
}: FavoriteButtonProps) {
  const { isFavoriteGame, toggleFavoriteGame } = useFavoriteGames()
  const isFavorite = isFavoriteGame(gameId)

  const handleToggleFavorite = () => {
    // Reason: HeroUI Button onPress doesn't need event handling - simplified for compatibility
    toggleFavoriteGame(gameId)
  }

  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        isIconOnly={variant === 'icon'}
        size={size}
        variant={isFavorite ? 'solid' : 'bordered'}
        color={isFavorite ? 'danger' : 'default'}
        onPress={handleToggleFavorite}
        className={`
          ${isFavorite ? 'text-white' : 'text-gray-400 hover:text-red-500'}
          transition-all duration-300
          ${className}
        `}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <motion.div
          animate={{
            scale: isFavorite ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 0.3,
            times: [0, 0.5, 1]
          }}
        >
          <HeartIcon filled={isFavorite} />
        </motion.div>
        {variant === 'full' && (
          <span className="ml-2">
            {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          </span>
        )}
      </Button>
    </motion.div>
  )
}