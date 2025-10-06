'use client'

import React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Button,
  Avatar,
  Divider,
  Card,
  CardBody
} from '@heroui/react'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { useWalletStore } from '@/stores/wallet'

// Navigation icons
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
)

const GamesIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M21,6H3A1,1 0 0,0 2,7V17A1,1 0 0,0 3,18H21A1,1 0 0,0 22,17V7A1,1 0 0,0 21,6M20,16H4V8H20V16Z" />
  </svg>
)

const LeaderboardIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M16,5V18H21V5M4,18H9V12H4M10,18H15V9H10V18Z" />
  </svg>
)

const ProfileIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,8.39C13.57,9.4 15.42,10 17.42,10C18.2,10 18.95,9.91 19.67,9.74C19.88,10.45 20,11.21 20,12C20,16.41 16.41,20 12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C13.79,4 15.42,4.6 16.76,5.59C16.07,6.95 15.06,8.14 13.8,9.04C13.25,8.47 12.65,7.93 12,7.42C11.35,7.93 10.75,8.47 10.2,9.04C8.94,8.14 7.93,6.95 7.24,5.59C8.58,4.6 10.21,4 12,4Z" />
  </svg>
)

const WalletIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M21,18V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V6H20A2,2 0 0,0 18,8V16A2,2 0 0,0 20,18M20,8V16H18V8H20Z" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M14.08,15.59L16.67,13H7V11H16.67L14.08,8.41L15.49,7L20.49,12L15.49,17L14.08,15.59M19,3A2,2 0 0,1 21,5V9.67L19,7.67V5H5V19H19V16.33L21,14.33V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H19Z" />
  </svg>
)

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user, logout } = useAuthStore()
  const { openModal } = useUIStore()

  // Main navigation items
  const navigationItems = [
    {
      label: 'Home',
      href: '/',
      icon: HomeIcon
    },
    {
      label: 'Games',
      href: '/games',
      icon: GamesIcon
    },
    {
      label: 'Leaderboards',
      href: '/leaderboards',
      icon: LeaderboardIcon
    }
  ]

  // User menu items (when authenticated)
  const userMenuItems = [
    {
      label: 'Profile',
      href: '/profile',
      icon: ProfileIcon
    },
    {
      label: 'Wallet',
      href: '/wallet',
      icon: WalletIcon
    }
  ]

  const handleNavItemClick = () => {
    // Close menu when navigation item is clicked
    onClose()
  }

  const handleLogin = () => {
    openModal('login')
    onClose()
  }

  const handleRegister = () => {
    openModal('register')
    onClose()
  }

  const handleLogout = () => {
    logout()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Menu Panel */}
          <motion.div
            className="fixed top-0 left-0 h-full w-80 bg-card/95 backdrop-blur-md border-r border-border z-50 sm:hidden overflow-y-auto"
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <motion.div
                    className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-glow"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="text-white font-bold text-sm">S</span>
                  </motion.div>
                  <span className="font-bold text-lg gradient-text">Yois Gaming</span>
                </div>

                {/* Close Button */}
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={onClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </Button>
              </div>

              {/* User Section */}
              {user ? (
                <Card className="mb-6 bg-card/50 border-border/50">
                  <CardBody className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar
                        {...(user.avatar && { src: user.avatar })}
                        name={user.username}
                        size="sm"
                        className="shadow-md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {user.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Level {user.level}
                        </p>
                      </div>
                    </div>

                    {/* Balance */}
                    <div
                      className="flex items-center justify-between p-2 bg-background/50 rounded-lg cursor-pointer hover:bg-background/70 transition-colors"
                      onClick={() => {
                        openModal('wallet')
                        onClose()
                      }}
                      title="Click to open wallet"
                    >
                      <span className="text-sm text-muted-foreground">Balance</span>
                      <span className="font-mono font-semibold text-primary">
                        {walletLoading ? '$---.--' : formatCurrency(balance)}
                      </span>
                    </div>
                  </CardBody>
                </Card>
              ) : (
                // Guest Section
                <Card className="mb-6 bg-card/50 border-border/50">
                  <CardBody className="p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Join the excitement! Sign up to start playing.
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        variant="bordered"
                        size="sm"
                        onPress={handleLogin}
                        className="flex-1"
                      >
                        Login
                      </Button>
                      <Button
                        color="primary"
                        size="sm"
                        onPress={handleRegister}
                        className="flex-1"
                      >
                        Sign Up
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Navigation */}
              <nav>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Navigation
                </h3>

                <div className="space-y-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleNavItemClick}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Icon />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>

                {/* User Menu (authenticated only) */}
                {user && (
                  <>
                    <Divider className="my-4 bg-border/50" />

                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Account
                    </h3>

                    <div className="space-y-1">
                      {userMenuItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleNavItemClick}
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Icon />
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        )
                      })}

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors w-full text-left"
                      >
                        <LogoutIcon />
                        <span className="font-medium">Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </nav>

              {/* Quick Actions */}
              <div className="mt-8 pt-4 border-t border-border/50">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Quick Actions
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/games/sugar-rush"
                    onClick={handleNavItemClick}
                    className="p-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/20 rounded-lg text-center hover:from-pink-500/30 hover:to-purple-500/30 transition-all"
                  >
                    <div className="text-lg mb-1">🍭</div>
                    <div className="text-xs font-medium text-pink-300">Sugar Rush</div>
                  </Link>

                  <Link
                    href="/games/mines"
                    onClick={handleNavItemClick}
                    className="p-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/20 rounded-lg text-center hover:from-orange-500/30 hover:to-red-500/30 transition-all"
                  >
                    <div className="text-lg mb-1">💣</div>
                    <div className="text-xs font-medium text-orange-300">Mines</div>
                  </Link>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-border/50 text-center">
                <p className="text-xs text-muted-foreground">
                  © 2024 Yois Gaming
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Play responsibly
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}