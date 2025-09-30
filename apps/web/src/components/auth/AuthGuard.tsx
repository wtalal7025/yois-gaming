'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Spinner } from '@heroui/react'
import { useAuthStore } from '@/stores/auth'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
  roles?: string[]
}

/**
 * AuthGuard component that protects routes based on authentication status
 * 
 * Features:
 * - Protects routes that require authentication
 * - Redirects unauthenticated users to login
 * - Shows loading state during authentication check
 * - Supports role-based access control
 * - Customizable fallback component
 */
export function AuthGuard({ 
  children, 
  fallback,
  requireAuth = true,
  redirectTo = '/games',
  roles = []
}: AuthGuardProps) {
  const router = useRouter()
  const { user, isAuthenticated, isInitialized, validateSession } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuthentication = async () => {
      if (!isInitialized) {
        // Wait for auth store to initialize
        return
      }

      try {
        // Validate current session
        await validateSession()
      } catch (error) {
        // Session validation failed, user will be logged out by the store
        console.warn('Session validation failed:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkAuthentication()
  }, [isInitialized, validateSession])

  // Still initializing or checking authentication
  if (!isInitialized || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-glow mb-4 mx-auto">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <Spinner size="lg" color="primary" className="mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </motion.div>
      </div>
    )
  }

  // Route requires authentication but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Redirect to login or show fallback
    if (fallback) {
      return <>{fallback}</>
    }

    // Redirect to games page (which will show login modal)
    router.replace(redirectTo)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-muted-foreground">Redirecting to login...</p>
        </motion.div>
      </div>
    )
  }

  // Route requires specific roles but user doesn't have them
  if (requireAuth && isAuthenticated && roles.length > 0) {
    const userRoles = user?.roles || []
    const hasRequiredRole = roles.some(role => userRoles.includes(role))

    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto p-8"
          >
            <div className="w-16 h-16 bg-danger/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
              <svg className="w-8 h-8 text-danger" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page. Required roles: {roles.join(', ')}
            </p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go Back
            </button>
          </motion.div>
        </div>
      )
    }
  }

  // User is authenticated and has required permissions
  return <>{children}</>
}

// Higher-order component version for easier use
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps?: Omit<AuthGuardProps, 'children'>
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...guardProps}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}

// Hook for checking auth status in components
export function useRequireAuth(redirectTo?: string) {
  const router = useRouter()
  const { isAuthenticated, isInitialized } = useAuthStore()

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace(redirectTo || '/games')
    }
  }, [isAuthenticated, isInitialized, router, redirectTo])

  return { isAuthenticated, isInitialized }
}