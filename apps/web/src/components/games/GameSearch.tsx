/**
 * Game Search Component
 * Advanced search functionality with filters, suggestions, and search history
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Input, Button, Chip, Card, CardBody, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameSearch } from '../../stores/gamePreferences'
import { searchGames, getGamesByCategory } from '../../lib/gameRegistry'

interface GameSearchProps {
  onSearchResults: (results: any[]) => void
  placeholder?: string
  showFilters?: boolean
  className?: string
}

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M3,2H21A1,1 0 0,1 22,3V6.5L14,14.5V22H10V14.5L2,6.5V3A1,1 0 0,1 3,2Z"/>
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.7L16.2,16.2Z"/>
  </svg>
)

export function GameSearch({ 
  onSearchResults, 
  placeholder = "Search games...", 
  showFilters = true,
  className = '' 
}: GameSearchProps) {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const { searchHistory, addSearchQuery, clearSearchHistory } = useGameSearch()

  // Get search results
  const searchResults = useMemo(() => {
    if (!query.trim()) return []
    
    let results = searchGames(query)
    
    // Apply category filters
    if (activeFilters.length > 0) {
      results = results.filter(game => 
        activeFilters.includes(game.category) ||
        (activeFilters.includes('popular') && game.isPopular) ||
        (activeFilters.includes('new') && game.isNew)
      )
    }
    
    return results
  }, [query, activeFilters])

  // Update search results when they change
  useEffect(() => {
    onSearchResults(searchResults)
  }, [searchResults, onSearchResults])

  // Handle search submission
  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      addSearchQuery(searchQuery)
      setQuery(searchQuery)
      setShowSuggestions(false)
    }
  }

  // Handle filter toggle
  const toggleFilter = (filter: string) => {
    setActiveFilters(prev => 
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    )
  }

  // Available filter options
  const filterOptions = [
    { key: 'popular', label: 'Popular', color: 'primary' },
    { key: 'new', label: 'New', color: 'success' },
    { key: 'slots', label: 'Slots', color: 'secondary' },
    { key: 'skill', label: 'Skill Games', color: 'warning' },
    { key: 'crash', label: 'Crash Games', color: 'danger' },
    { key: 'other', label: 'Other', color: 'default' }
  ]

  // Search suggestions based on query
  const suggestions = useMemo(() => {
    if (!query.trim()) return searchHistory.slice(0, 3)
    
    const gameMatches = searchGames(query).slice(0, 3).map(game => game.title)
    const historyMatches = searchHistory.filter(h => 
      h.includes(query.toLowerCase()) && h !== query.toLowerCase()
    ).slice(0, 2)
    
    return [...gameMatches, ...historyMatches].slice(0, 5)
  }, [query, searchHistory])

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={query}
          onValueChange={setQuery}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch(query)
            } else if (e.key === 'Escape') {
              setShowSuggestions(false)
            }
          }}
          startContent={<SearchIcon />}
          endContent={
            query && (
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={() => {
                  setQuery('')
                  onSearchResults([])
                }}
              >
                ×
              </Button>
            )
          }
          className="w-full"
        />

        {/* Search Suggestions */}
        <AnimatePresence>
          {showSuggestions && (suggestions.length > 0 || searchHistory.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 z-50 mt-1"
            >
              <Card>
                <CardBody className="p-2">
                  {suggestions.length > 0 && (
                    <div className="space-y-1">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearch(suggestion)}
                          className="flex items-center space-x-2 w-full p-2 text-left rounded hover:bg-muted/50 transition-colors"
                        >
                          <ClockIcon />
                          <span className="text-sm">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {searchHistory.length > 0 && (
                    <div className="flex items-center justify-between pt-2 mt-2 border-t">
                      <span className="text-xs text-muted-foreground">Search History</span>
                      <Button
                        size="sm"
                        variant="light"
                        onPress={clearSearchHistory}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <FilterIcon />
            Filters:
          </span>
          
          {filterOptions.map((filter) => (
            <Chip
              key={filter.key}
              variant={activeFilters.includes(filter.key) ? 'solid' : 'bordered'}
              color={activeFilters.includes(filter.key) ? filter.color as any : 'default'}
              size="sm"
              className="cursor-pointer"
              onClick={() => toggleFilter(filter.key)}
            >
              {filter.label}
            </Chip>
          ))}
          
          {activeFilters.length > 0 && (
            <Button
              size="sm"
              variant="light"
              onPress={() => setActiveFilters([])}
            >
              Clear All
            </Button>
          )}
        </div>
      )}

      {/* Search Results Summary */}
      {query && (
        <div className="mt-2 text-sm text-muted-foreground">
          {searchResults.length === 0 ? (
            'No games found'
          ) : (
            `Found ${searchResults.length} game${searchResults.length === 1 ? '' : 's'} for "${query}"`
          )}
        </div>
      )}

      {/* Click outside handler */}
      {showSuggestions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  )
}