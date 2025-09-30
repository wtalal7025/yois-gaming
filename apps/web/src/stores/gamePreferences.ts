/**
 * Game Preferences Store
 * Manages user preferences for games including favorites, recent games, and settings
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GameType } from '@stake-games/shared'

interface GamePreferences {
  // Favorite games
  favoriteGames: GameType[]
  
  // Recently played games with timestamps
  recentGames: Array<{
    gameId: GameType
    lastPlayed: string
    sessionCount: number
  }>
  
  // Game settings
  preferences: {
    soundEnabled: boolean
    animationSpeed: 'slow' | 'normal' | 'fast'
    autoPlay: boolean
    showDemoMode: boolean
  }
  
  // Search history
  searchHistory: string[]
}

interface GamePreferencesActions {
  // Favorite games actions
  toggleFavoriteGame: (gameId: GameType) => void
  isFavoriteGame: (gameId: GameType) => boolean
  
  // Recent games actions
  addRecentGame: (gameId: GameType) => void
  clearRecentGames: () => void
  
  // Search actions
  addSearchQuery: (query: string) => void
  clearSearchHistory: () => void
  
  // Settings actions
  updatePreferences: (preferences: Partial<GamePreferences['preferences']>) => void
  
  // Utility actions
  reset: () => void
}

type GamePreferencesStore = GamePreferences & GamePreferencesActions

const initialState: GamePreferences = {
  favoriteGames: [],
  recentGames: [],
  preferences: {
    soundEnabled: true,
    animationSpeed: 'normal',
    autoPlay: false,
    showDemoMode: true
  },
  searchHistory: []
}

export const useGamePreferencesStore = create<GamePreferencesStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Favorite games actions
      toggleFavoriteGame: (gameId: GameType) => {
        set((state) => ({
          favoriteGames: state.favoriteGames.includes(gameId)
            ? state.favoriteGames.filter(id => id !== gameId)
            : [...state.favoriteGames, gameId]
        }))
      },
      
      isFavoriteGame: (gameId: GameType) => {
        return get().favoriteGames.includes(gameId)
      },
      
      // Recent games actions
      addRecentGame: (gameId: GameType) => {
        set((state) => {
          const now = new Date().toISOString()
          const existingIndex = state.recentGames.findIndex(game => game.gameId === gameId)
          
          let newRecentGames
          
          if (existingIndex >= 0) {
            // Update existing game
            newRecentGames = [...state.recentGames]
            newRecentGames[existingIndex] = {
              gameId,
              lastPlayed: now,
              sessionCount: newRecentGames[existingIndex].sessionCount + 1
            }
            // Move to front
            const updatedGame = newRecentGames.splice(existingIndex, 1)[0]
            newRecentGames.unshift(updatedGame)
          } else {
            // Add new game
            newRecentGames = [
              { gameId, lastPlayed: now, sessionCount: 1 },
              ...state.recentGames
            ]
          }
          
          // Keep only the last 10 recent games
          return {
            recentGames: newRecentGames.slice(0, 10)
          }
        })
      },
      
      clearRecentGames: () => {
        set({ recentGames: [] })
      },
      
      // Search actions
      addSearchQuery: (query: string) => {
        if (!query.trim()) return
        
        set((state) => {
          const trimmedQuery = query.trim().toLowerCase()
          const filteredHistory = state.searchHistory.filter(q => q !== trimmedQuery)
          
          return {
            searchHistory: [trimmedQuery, ...filteredHistory].slice(0, 5) // Keep last 5 searches
          }
        })
      },
      
      clearSearchHistory: () => {
        set({ searchHistory: [] })
      },
      
      // Settings actions
      updatePreferences: (newPreferences) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...newPreferences
          }
        }))
      },
      
      // Utility actions
      reset: () => {
        set(initialState)
      }
    }),
    {
      name: 'game-preferences',
      // Only persist certain parts to avoid storing sensitive data
      partialize: (state) => ({
        favoriteGames: state.favoriteGames,
        recentGames: state.recentGames,
        preferences: state.preferences,
        searchHistory: state.searchHistory
      })
    }
  )
)

// Utility hooks for easier access
export const useFavoriteGames = () => {
  const { favoriteGames, toggleFavoriteGame, isFavoriteGame } = useGamePreferencesStore()
  return { favoriteGames, toggleFavoriteGame, isFavoriteGame }
}

export const useRecentGames = () => {
  const { recentGames, addRecentGame, clearRecentGames } = useGamePreferencesStore()
  return { recentGames, addRecentGame, clearRecentGames }
}

export const useGameSearch = () => {
  const { searchHistory, addSearchQuery, clearSearchHistory } = useGamePreferencesStore()
  return { searchHistory, addSearchQuery, clearSearchHistory }
}