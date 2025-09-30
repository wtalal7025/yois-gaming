/**
 * Authentication and User Management Types
 * Shared between frontend and backend for type safety
 */

export interface User {
  id: string
  username: string
  email: string
  passwordHash?: string // Only populated on backend for authentication
  avatarUrl?: string
  balance: number
  level: number
  experiencePoints: number
  totalWagered: number
  totalWon: number
  gamesPlayed: number
  isActive: boolean
  isVerified: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface UserSession {
  id: string
  userId: string
  sessionToken: string
  refreshToken: string
  deviceInfo?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  isActive: boolean
  expiresAt: string
  lastUsedAt: string
  createdAt: string
}

export interface UserPreferences {
  id: string
  userId: string
  autoPlayEnabled: boolean
  soundEnabled: boolean
  animationSpeed: 'slow' | 'normal' | 'fast'
  theme: 'dark' | 'light'
  language: string
  currency: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
  privacySettings: {
    profileVisible: boolean
    statsVisible: boolean
  }
  createdAt: string
  updatedAt: string
}

// Authentication request/response types
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
  deviceInfo?: Record<string, any>
}

export interface RegisterData {
  username: string
  email: string
  password: string
  confirmPassword: string
  subscribeNewsletter?: boolean
  acceptedTerms: boolean
  acceptedPrivacy: boolean
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  acceptedTerms: boolean
  acceptedPrivacy: boolean
  subscribeNewsletter?: boolean
  deviceInfo?: Record<string, any>
}

export interface AuthResponse {
  success: boolean
  user: User
  accessToken: string
  refreshToken: string
  expiresAt: string
}

// Alias for backward compatibility
export type LoginResponse = AuthResponse
export type RegisterResponse = AuthResponse

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  success: boolean
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirmRequest {
  token: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface UpdateProfileRequest {
  username?: string
  email?: string
  avatarUrl?: string
}

export interface UpdatePreferencesRequest {
  autoPlayEnabled?: boolean
  soundEnabled?: boolean
  animationSpeed?: 'slow' | 'normal' | 'fast'
  theme?: 'dark' | 'light'
  language?: string
  currency?: string
  notifications?: {
    email?: boolean
    push?: boolean
    sms?: boolean
  }
  privacySettings?: {
    profileVisible?: boolean
    statsVisible?: boolean
  }
}

// JWT Token payload interface
export interface JWTPayload {
  sub: string // user ID
  username: string
  email: string
  role?: string
  sessionId: string
  iat: number
  exp: number
}

// Authentication state for frontend stores
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  lastActivity?: string
}

// Validation error interface
export interface ValidationError {
  field: string
  message: string
  code?: string
}

// Session management
export interface SessionInfo {
  id: string
  deviceInfo?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  isActive: boolean
  isCurrent: boolean
  lastUsed: string
  created: string
}

export interface LogoutRequest {
  sessionId?: string // If provided, logout specific session, otherwise current session
  allSessions?: boolean // If true, logout all sessions
}

// Password strength validation
export interface PasswordStrength {
  score: number // 0-4
  isValid: boolean
  feedback: string[]
  suggestions: string[]
}

// Rate limiting information
export interface RateLimitInfo {
  attempts: number
  maxAttempts: number
  resetTime: string
  blocked: boolean
}

// Audit log entry
export interface AuditLogEntry {
  id: string
  userId?: string
  action: string
  resourceType?: string
  resourceId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

// User statistics for profile
export interface UserStats {
  totalBets: number
  totalWagered: number
  totalWon: number
  netProfit: number
  winRate: number
  favoriteGame?: string
  longestWinStreak: number
  biggestWin: number
  averageBet: number
}