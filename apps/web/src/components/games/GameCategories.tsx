/**
 * GameCategories Component
 * Game filtering and categorization interface
 */

'use client'

import React, { useState } from 'react'
import { Button, Chip, Input, Card, CardBody } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { MagnifyingGlassIcon, FunnelIcon, StarIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { getCategoryDisplayName, type GameCategory } from '../../lib/gameRegistry'

/**
 * Available filter categories
 */
type FilterCategory = GameCategory | 'all' | 'popular' | 'new'

/**
 * Props for GameCategories component
 */
interface GameCategoriesProps {
  activeCategory: FilterCategory
  onCategoryChange: (category: FilterCategory) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  gameCount?: number
  className?: string
}

/**
 * Category button configuration
 */
const CATEGORY_CONFIG: Array<{
  id: FilterCategory
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}> = [
  {
    id: 'all',
    label: 'All Games',
    icon: ({ className }) => <FunnelIcon className={className} />,
    description: 'View all available games'
  },
  { 
    id: 'popular', 
    label: 'Popular', 
    icon: ({ className }) => <StarIcon className={className} />,
    description: 'Most played games'
  },
  { 
    id: 'new', 
    label: 'New', 
    icon: ({ className }) => <SparklesIcon className={className} />,
    description: 'Recently added games'
  },
  { 
    id: 'slots', 
    label: 'Slots', 
    icon: ({ className }) => <div className={className}>🎰</div>,
    description: 'Slot machine games'
  },
  { 
    id: 'skill', 
    label: 'Skill Games', 
    icon: ({ className }) => <div className={className}>🎯</div>,
    description: 'Strategy and skill-based games'
  },
  { 
    id: 'crash', 
    label: 'Crash Games', 
    icon: ({ className }) => <div className={className}>📈</div>,
    description: 'Real-time multiplier games'
  },
  { 
    id: 'other', 
    label: 'Other', 
    icon: ({ className }) => <div className={className}>🎲</div>,
    description: 'Unique game experiences'
  }
]

/**
 * GameCategories component for filtering games by category and search
 * Reason: Provides intuitive filtering interface with search and category selection
 */
export function GameCategories({ 
  activeCategory, 
  onCategoryChange, 
  searchQuery, 
  onSearchChange,
  gameCount,
  className = '' 
}: GameCategoriesProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  return (
    <Card className={`bg-background border-1 border-default-200 ${className}`}>
      <CardBody className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-orbitron">
                Game Library
              </h2>
              <p className="text-sm text-foreground-600">
                {gameCount !== undefined ? `${gameCount} games available` : 'Browse our collection'}
              </p>
            </div>
            
            {/* Search Input */}
            <div className="w-full sm:w-80">
              <Input
                placeholder="Search games..."
                value={searchQuery}
                onValueChange={onSearchChange}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                startContent={
                  <MagnifyingGlassIcon className="w-4 h-4 text-foreground-500" />
                }
                variant="bordered"
                classNames={{
                  input: "text-sm",
                  inputWrapper: [
                    "border-1",
                    "border-default-200",
                    "data-[hover=true]:border-primary-300",
                    "group-data-[focus=true]:border-primary-500",
                    "transition-colors",
                    "duration-200"
                  ]
                }}
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-foreground-600" />
              <h3 className="text-sm font-semibold text-foreground-600 uppercase tracking-wider">
                Categories
              </h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {CATEGORY_CONFIG.map((category) => {
                const isActive = activeCategory === category.id
                const Icon = category.icon
                
                return (
                  <motion.div
                    key={category.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant={isActive ? "solid" : "bordered"}
                      color={isActive ? "primary" : "default"}
                      onPress={() => onCategoryChange(category.id)}
                      className={`
                        h-auto p-3 flex flex-col items-center gap-2 w-full
                        ${isActive 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-background border-default-200 hover:border-primary-300 hover:bg-default-50'
                        }
                        transition-all duration-200
                      `}
                      title={category.description}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium leading-tight text-center">
                        {category.label}
                      </span>
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Active Filter Display */}
          <AnimatePresence>
            {(activeCategory !== 'all' || searchQuery) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-center gap-2 pt-2 border-t border-default-200"
              >
                <span className="text-sm text-foreground-600">Active filters:</span>
                
                {activeCategory !== 'all' && (
                  <Chip
                    color="primary"
                    variant="flat"
                    onClose={() => onCategoryChange('all')}
                    className="text-xs"
                  >
                    {getCategoryDisplayName(activeCategory)}
                  </Chip>
                )}
                
                {searchQuery && (
                  <Chip
                    color="secondary"
                    variant="flat"
                    onClose={() => onSearchChange('')}
                    className="text-xs"
                  >
                    Search: "{searchQuery}"
                  </Chip>
                )}
                
                {(activeCategory !== 'all' || searchQuery) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      onCategoryChange('all')
                      onSearchChange('')
                    }}
                    className="text-xs h-6 px-2 min-w-0"
                  >
                    Clear all
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardBody>
    </Card>
  )
}

/**
 * Compact version for mobile or smaller sections
 */
export function CompactGameCategories({
  activeCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  className = ''
}: Omit<GameCategoriesProps, 'gameCount'>) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search */}
      <Input
        placeholder="Search games..."
        value={searchQuery}
        onValueChange={onSearchChange}
        startContent={<MagnifyingGlassIcon className="w-4 h-4 text-foreground-500" />}
        variant="bordered"
        size="sm"
      />
      
      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_CONFIG.map((category) => (
          <Chip
            key={category.id}
            color={activeCategory === category.id ? "primary" : "default"}
            variant={activeCategory === category.id ? "solid" : "bordered"}
            className="cursor-pointer transition-all duration-200 hover:scale-105"
            onClick={() => onCategoryChange(category.id)}
          >
            {category.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}