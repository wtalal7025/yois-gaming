import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  User, 
  AuthState, 
  LoginCredentials, 
  RegisterData,
  ApiResponse 
} from '../types'

interface UserSession {
  id: string
  userId: string
  deviceInfo: string
  ipAddress: string
  userAgent: string
  isActive: boolean
  createdAt: string
  lastActivityAt: string
  expiresAt: string
}

interface AuthStore extends AuthState {
  // Additional auth state
  token: string | null
  refreshToken: string | null
  session: UserSession | null
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<boolean>
  validateSession: () => Promise<boolean>
  updateUser: (user: Partial<User>) => void
  updateBalance: (balance: number) => void
  clearError: () => void
  setLoading: (loading: boolean) => void
  
  // Session management
  checkAuthStatus: () => Promise<void>
  getCurrentSession: () => Promise<UserSession | null>
}

// API Configuration - handle both client and server environments
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side
    return (window as any).ENV?.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
  }
  // Server-side fallback
  return 'http://localhost:3001/api'
}

// API Client with automatic token refresh
class AuthApiClient {
  private static instance: AuthApiClient
  private store: any // Will be set after store creation

  static getInstance(): AuthApiClient {
    if (!AuthApiClient.instance) {
      AuthApiClient.instance = new AuthApiClient()
    }
    return AuthApiClient.instance
  }

  setStore(store: any) {
    this.store = store
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${getApiBaseUrl()}${endpoint}`
    
    // Add auth header if we have a token
    const token = this.store?.getState()?.token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    }
    
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    // DEBUG: Log API request details
    console.log('🔍 AUTH API REQUEST:', {
      method: options.method || 'GET',
      url,
      hasToken: !!token,
      headers: Object.keys(headers)
    })

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include' // Include cookies for refresh tokens
      })

      // DEBUG: Log response details
      console.log('📡 AUTH API RESPONSE:', {
        url,
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('❌ Failed to parse response JSON:', parseError)
        const textResponse = await response.text()
        console.log('📄 Raw response text:', textResponse)
        
        return {
          success: false,
          error: `Invalid JSON response from server. Status: ${response.status}`,
          timestamp: new Date().toISOString()
        }
      }

      // DEBUG: Log parsed response data
      console.log('📋 PARSED RESPONSE DATA:', data)

      // If token expired and we have a refresh token, try to refresh
      if (response.status === 401 && token && this.store) {
        console.log('🔄 Token expired, attempting refresh...')
        const refreshed = await this.store.getState().refreshAccessToken()
        if (refreshed) {
          // Retry the request with new token
          headers.Authorization = `Bearer ${this.store.getState().token}`
          const retryResponse = await fetch(url, {
            ...options,
            headers,
            credentials: 'include'
          })
          return retryResponse.json()
        }
      }

      if (!response.ok) {
        console.error('❌ API Error Response:', {
          status: response.status,
          error: data.error || `HTTP ${response.status}`,
          data
        })
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          timestamp: new Date().toISOString()
        }
      }

      return data
    } catch (error) {
      console.error('❌ API request failed with network error:', {
        url,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      })
      return {
        success: false,
        error: 'Network error. Please check your connection.',
        timestamp: new Date().toISOString()
      }
    }
  }

  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string; refreshToken: string; session: UserSession }>> {
    return this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
  }

  async register(data: RegisterData): Promise<ApiResponse<{ user: User; token: string; refreshToken: string; session: UserSession }>> {
    return this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest('/auth/logout', {
      method: 'POST'
    })
  }

  async refreshToken(): Promise<ApiResponse<{ token: string; refreshToken: string; user: User }>> {
    return this.makeRequest('/auth/refresh', {
      method: 'POST'
    })
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User; session: UserSession }>> {
    return this.makeRequest('/auth/profile')
  }

  async validateSession(): Promise<ApiResponse<{ valid: boolean; session?: UserSession }>> {
    return this.makeRequest('/auth/validate')
  }
}

const apiClient = AuthApiClient.getInstance()

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await apiClient.login(credentials)
          
          if (response.success && response.data) {
            const { user, token, refreshToken, session } = response.data
            
            set({
              user,
              token,
              refreshToken,
              session,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
          } else {
            set({
              error: response.error || 'Login failed',
              isLoading: false
            })
          }
        } catch (error) {
          console.error('Login error:', error)
          set({
            error: 'Network error. Please try again.',
            isLoading: false
          })
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null })
        
        try {
          // Client-side validation
          if (data.password !== data.confirmPassword) {
            set({
              error: 'Passwords do not match',
              isLoading: false
            })
            return
          }

          if (data.password.length < 8) {
            set({
              error: 'Password must be at least 8 characters long',
              isLoading: false
            })
            return
          }

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            set({
              error: 'Please enter a valid email address',
              isLoading: false
            })
            return
          }

          if (data.username.length < 3) {
            set({
              error: 'Username must be at least 3 characters long',
              isLoading: false
            })
            return
          }

          const response = await apiClient.register(data)
          
          if (response.success && response.data) {
            const { user, token, refreshToken, session } = response.data
            
            set({
              user,
              token,
              refreshToken,
              session,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
          } else {
            set({
              error: response.error || 'Registration failed',
              isLoading: false
            })
          }
        } catch (error) {
          console.error('Registration error:', error)
          set({
            error: 'Network error. Please try again.',
            isLoading: false
          })
        }
      },

      logout: async () => {
        set({ isLoading: true })
        
        try {
          // Call logout API to invalidate server-side session
          await apiClient.logout()
        } catch (error) {
          console.error('Logout API error:', error)
          // Continue with client-side logout even if API call fails
        }
        
        // Clear all authentication state
        set({
          user: null,
          token: null,
          refreshToken: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        })
      },

      refreshAccessToken: async (): Promise<boolean> => {
        const { refreshToken } = get()
        
        if (!refreshToken) {
          return false
        }

        try {
          const response = await apiClient.refreshToken()
          
          if (response.success && response.data) {
            const { token, refreshToken: newRefreshToken, user } = response.data
            
            set({
              token,
              refreshToken: newRefreshToken,
              user,
              isAuthenticated: true
            })
            
            return true
          } else {
            // Refresh failed, clear auth state
            set({
              user: null,
              token: null,
              refreshToken: null,
              session: null,
              isAuthenticated: false
            })
            return false
          }
        } catch (error) {
          console.error('Token refresh error:', error)
          // Clear auth state on refresh failure
          set({
            user: null,
            token: null,
            refreshToken: null,
            session: null,
            isAuthenticated: false
          })
          return false
        }
      },

      validateSession: async (): Promise<boolean> => {
        const { token } = get()
        
        if (!token) {
          return false
        }

        try {
          const response = await apiClient.validateSession()
          
          if (response.success && response.data?.valid) {
            if (response.data.session) {
              set({ session: response.data.session })
            }
            return true
          } else {
            // Session invalid, try to refresh token
            return await get().refreshAccessToken()
          }
        } catch (error) {
          console.error('Session validation error:', error)
          return false
        }
      },

      checkAuthStatus: async () => {
        const { token, refreshToken } = get()
        
        if (!token && !refreshToken) {
          return
        }

        set({ isLoading: true })
        
        try {
          // Try to validate current session
          const isValid = await get().validateSession()
          
          if (!isValid) {
            // If validation fails, try refresh token
            const refreshed = await get().refreshAccessToken()
            
            if (!refreshed) {
              // Both validation and refresh failed, clear auth state
              set({
                user: null,
                token: null,
                refreshToken: null,
                session: null,
                isAuthenticated: false
              })
            }
          }
        } catch (error) {
          console.error('Auth status check error:', error)
          set({
            user: null,
            token: null,
            refreshToken: null,
            session: null,
            isAuthenticated: false
          })
        } finally {
          set({ isLoading: false })
        }
      },

      getCurrentSession: async (): Promise<UserSession | null> => {
        try {
          const response = await apiClient.getCurrentUser()
          
          if (response.success && response.data) {
            const { user, session } = response.data
            
            set({ user, session })
            return session
          }
        } catch (error) {
          console.error('Get current session error:', error)
        }
        
        return null
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData }
          })
        }
      },

      updateBalance: (balance: number) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, balance }
          })
        }
      },

      clearError: () => {
        set({ error: null })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state: AuthStore) => ({
        // Persist user, tokens, and session
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        session: state.session,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state: AuthStore | null) => {
        // Set up API client reference after rehydration
        if (state) {
          apiClient.setStore(useAuthStore)
          
          // Check auth status on app load
          state.checkAuthStatus()
        }
      }
    }
  )
)

// Set up API client reference immediately
apiClient.setStore(useAuthStore)

// Utility hooks for common auth operations
export const useUser = () => useAuthStore((state: AuthStore) => state.user)
export const useIsAuthenticated = () => useAuthStore((state: AuthStore) => state.isAuthenticated)
export const useAuthLoading = () => useAuthStore((state: AuthStore) => state.isLoading)
export const useAuthError = () => useAuthStore((state: AuthStore) => state.error)
export const useAuthToken = () => useAuthStore((state: AuthStore) => state.token)
export const useCurrentSession = () => useAuthStore((state: AuthStore) => state.session)

// Auth actions hooks
export const useAuthActions = () => {
  const store = useAuthStore()
  return {
    login: store.login,
    register: store.register,
    logout: store.logout,
    refreshToken: store.refreshAccessToken,
    validateSession: store.validateSession,
    checkAuthStatus: store.checkAuthStatus,
    updateUser: store.updateUser,
    updateBalance: store.updateBalance,
    clearError: store.clearError
  }
}

// Session management hook
export const useSessionManager = () => {
  const { checkAuthStatus, validateSession, getCurrentSession } = useAuthStore()
  
  return {
    checkAuthStatus,
    validateSession,
    getCurrentSession,
    // Auto-refresh token before expiry
    setupTokenRefresh: () => {
      const { token, refreshAccessToken } = useAuthStore.getState()
      
      if (!token) return
      
      try {
        // Parse JWT to get expiry time
        const tokenParts = token.split('.')
        if (tokenParts.length !== 3) return
        
        const payload = JSON.parse(atob(tokenParts[1]))
        const expiryTime = payload.exp * 1000 // Convert to milliseconds
        const refreshTime = expiryTime - 5 * 60 * 1000 // Refresh 5 minutes before expiry
        const timeUntilRefresh = refreshTime - Date.now()
        
        if (timeUntilRefresh > 0) {
          setTimeout(() => {
            refreshAccessToken()
          }, timeUntilRefresh)
        }
      } catch (error) {
        console.error('Error parsing token for auto-refresh:', error)
      }
    }
  }
}

// Note: Session manager initialization should be done in a component or custom hook
// This was moved to prevent "Invalid hook call" errors