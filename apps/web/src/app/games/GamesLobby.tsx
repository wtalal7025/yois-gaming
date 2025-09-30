/**
 * Games Lobby Client Component
 * Main interactive lobby component with filtering, search, and game display
 */

'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Divider } from '@heroui/react'
import { GameCategories } from '../../components/games/GameCategories'
import { GameGrid } from '../../components/games/GameGrid'
import { GameSearch } from '../../components/games/GameSearch'
import { RecentGames } from '../../components/games/RecentGames'
import {
  getGamesByCategory,
  getTotalPlayerCount,
  getHighestRecentWin,
  type GameCategory,
  type GameInfo
} from '../../lib/gameRegistry'

/**
 * Filter category type (extends GameCategory to include special categories)
 */
type FilterCategory = GameCategory | 'all' | 'popular' | 'new'

/**
 * Games Lobby component with full filtering and display functionality
 * Reason: Manages game filtering state and provides complete lobby experience
 */
export function GamesLobby() {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all')
  const [searchResults, setSearchResults] = useState<GameInfo[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get all categorized games
  const gamesByCategory = useMemo(() => getGamesByCategory(), [])

  // Determine which games to display
  const displayedGames = useMemo(() => {
    if (isSearching) {
      return searchResults
    }
    return gamesByCategory[activeCategory] || []
  }, [isSearching, searchResults, activeCategory, gamesByCategory])

  // Simulate loading when category changes
  useEffect(() => {
    if (!isSearching) {
      setIsLoading(true)
      const timer = setTimeout(() => setIsLoading(false), 300)
      return () => clearTimeout(timer)
    }
  }, [activeCategory, isSearching])

  // Handle category change
  const handleCategoryChange = (category: FilterCategory) => {
    setActiveCategory(category)
    setIsSearching(false)
    setSearchResults([])
    setSearchQuery('')
  }

  // Handle search results from GameSearch component
  const handleSearchResults = (results: GameInfo[]) => {
    setSearchResults(results)
    setIsSearching(results.length > 0 || searchQuery.trim().length > 0)
  }

  // Handle search query change (for GameCategories integration)
  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setIsSearching(false)
      setSearchResults([])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-default-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Header Section */}
          <div className="text-center space-y-4">
            <motion.h1 
              className="text-4xl md:text-5xl font-bold text-foreground font-orbitron bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Game Library
            </motion.h1>
            
            <motion.p 
              className="text-lg text-foreground-600 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Experience thrilling games with provably fair outcomes. 
              Choose from skill-based challenges, classic slots, and innovative crash games.
            </motion.p>

            {/* Platform Stats */}
            <motion.div 
              className="flex flex-wrap justify-center gap-6 text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="text-foreground-700">
                  <strong>{getTotalPlayerCount()}</strong> players online
                </span>
              </div>
              
              <div className="flex items-center gap-2 bg-secondary/10 rounded-full px-4 py-2">
                <span className="text-xl">🏆</span>
                <span className="text-foreground-700">
                  Biggest win: <strong>${getHighestRecentWin().toLocaleString()}</strong>
                </span>
              </div>
              
              <div className="flex items-center gap-2 bg-success/10 rounded-full px-4 py-2">
                <span className="text-xl">✨</span>
                <span className="text-foreground-700">
                  <strong>100%</strong> provably fair
                </span>
              </div>
            </motion.div>
          </div>

          <Divider className="bg-gradient-to-r from-transparent via-default-300 to-transparent" />

          {/* Search Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <GameSearch onSearchResults={handleSearchResults} />
          </motion.div>

          {/* Recent Games Section - Only show when not searching */}
          {!isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <RecentGames variant="compact" maxGames={6} />
            </motion.div>
          )}

          {/* Categories and Games Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* Only show categories when not searching */}
            {!isSearching && (
              <GameCategories
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
                searchQuery={searchQuery}
                onSearchChange={handleSearchQueryChange}
                gameCount={displayedGames.length}
              />
            )}

            <Divider className="opacity-20" />

            {/* Games Grid */}
            <GameGrid
              games={displayedGames}
              isLoading={isLoading}
            />

            {/* Results Summary */}
            {!isLoading && displayedGames.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center mt-8"
              >
                <p className="text-sm text-foreground-500">
                  Showing {displayedGames.length} game{displayedGames.length !== 1 ? 's' : ''}
                  {!isSearching && activeCategory !== 'all' && ` in ${activeCategory} category`}
                  {isSearching && ' from search results'}
                </p>
              </motion.div>
            )}

            {/* Empty State for Search */}
            {!isLoading && isSearching && displayedGames.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-foreground-700 mb-2">
                  No games found
                </h3>
                <p className="text-foreground-500 mb-6">
                  Try adjusting your search terms or browse by category
                </p>
                <motion.button
                  onClick={() => {
                    setIsSearching(false)
                    setSearchResults([])
                    setSearchQuery('')
                  }}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Browse All Games
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}