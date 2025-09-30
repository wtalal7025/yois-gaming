/**
 * Web Application Type Exports
 * Re-exports shared types and adds web-specific types
 * Reason: Provides single source of truth for types while avoiding conflicts
 */

// Re-export all shared types
export * from '@stake-games/shared'

// Additional web-specific types that extend the shared types
import type { ComponentType, ReactNode } from 'react'
import type { GameType, User } from '@stake-games/shared'

// Platform Navigation Types (Web-specific)
export interface NavItem {
  label: string
  href: string
  icon?: ComponentType<any>
  isActive?: boolean
  requiresAuth?: boolean
  badge?: string | number
  hasDropdown?: boolean
}

export interface BreadcrumbItem {
  label: string
  href?: string
  isActive?: boolean
}

// UI State Types (Web-specific)
export interface ModalState {
  isOpen: boolean
  type?: 'login' | 'register' | 'game' | 'profile' | 'settings' | 'wallet'
  data?: any
}

export interface ToastNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export interface LoadingState {
  isLoading: boolean
  message?: string
  progress?: number
}

// Component Prop Types (Web-specific)
export interface BaseComponentProps {
  className?: string
  children?: ReactNode
}

export interface GameCardProps extends BaseComponentProps {
  game: {
    id: GameType
    name: string
    description: string
    thumbnail: string
    category: string
    isActive: boolean
    minBet: number
    maxBet: number
    playersOnline: number
  }
  onPlay: (gameType: GameType) => void
  isPlaying?: boolean
}

export interface StatCardProps extends BaseComponentProps {
  title: string
  value: string | number
  icon?: ComponentType<any>
  trend?: {
    value: number
    isPositive: boolean
    label: string
  }
}

// Form State Types (Web-specific)
export interface ValidationError {
  field: string
  message: string
}

export interface FormState<T = any> {
  data: T
  errors: ValidationError[]
  isSubmitting: boolean
  isValid: boolean
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys]

// Re-export commonly used React types
export type { ReactNode, ComponentType, FC } from 'react'

// Extended User Stats (Web-specific extensions)
export interface ExtendedUserStats {
  totalBets: number
  totalWagered: number
  totalWon: number
  netProfit: number
  winRate: number
  favoriteGame?: GameType
  longestWinStreak: number
  biggestWin: number
  averageBet: number
  gamesPlayed: Record<GameType, number>
}

// Socket Events Types (Web-specific)
export interface SocketEvents {
  // Game events
  'game:join': { gameType: GameType; sessionId: string }
  'game:leave': { sessionId: string }
  'game:action': { sessionId: string; action: any }
  'game:update': { sessionId: string; state: any }
  
  // Platform events
  'user:online': { userId: string }
  'user:offline': { userId: string }
  'stats:update': any
  
  // Chat events (if implemented)
  'chat:message': { userId: string; message: string; timestamp: string }
  'chat:join': { roomId: string }
  'chat:leave': { roomId: string }
}