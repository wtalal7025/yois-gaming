'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Button,
  Avatar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Badge,
  Chip
} from '@heroui/react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/auth'
import { useUIStore } from '../../stores/ui'
import { useWalletStore } from '../../stores/wallet'
import type { NavItem } from '../../types'
import { getPopularGames, getGamesByCategory } from '../../lib/gameRegistry'

// Icons - using simple SVG icons for now (can be replaced with icon library)
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
)

const GameIcon = () => (
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

// Navigation items configuration
const navItems: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: HomeIcon
  },
  {
    label: 'Games',
    href: '/games',
    icon: GameIcon,
    hasDropdown: true
  },
  {
    label: 'Leaderboards',
    href: '/leaderboards',
    icon: LeaderboardIcon
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: ProfileIcon,
    requiresAuth: true
  }
]

export function Header() {
  const pathname = usePathname()
  const {
    user,
    isAuthenticated,
    logout,
    checkAuthStatus,
    isLoading: authLoading
  } = useAuthStore()
  const { openModal, isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useUIStore()
  const { balance, isLoading: walletLoading } = useWalletStore()

  // Reason: Initialize authentication state on component mount
  React.useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

  // Get games data for dropdown
  const popularGames = getPopularGames()
  const gameCategories = getGamesByCategory()

  // Format balance for display
  const formatBalance = (balance: number | null) => {
    if (balance === null || balance === undefined) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(balance)
  }

  // Handle authentication actions
  const handleLogin = () => {
    openModal('login')
    closeMobileMenu()
  }

  const handleRegister = () => {
    openModal('register')
    closeMobileMenu()
  }

  const handleLogout = () => {
    logout()
    closeMobileMenu()
  }

  const handleProfile = () => {
    // Navigate to profile page
    closeMobileMenu()
  }

  return (
    <Navbar
      isBordered
      isMenuOpen={isMobileMenuOpen}
      onMenuOpenChange={toggleMobileMenu}
      className="bg-dark-700/95 backdrop-blur-md border-border/50"
      maxWidth="full"
      height="4rem"
    >
      {/* Brand */}
      <NavbarContent className="sm:hidden" justify="start">
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarContent className="sm:hidden pr-3" justify="center">
        <NavbarBrand>
          <Link href="/" className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center"
            >
              <span className="text-white font-bold text-sm">S</span>
            </motion.div>
            <span className="font-bold text-xl gradient-text">Yois Gaming</span>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-8" justify="center">
        <NavbarBrand>
          <Link href="/" className="flex items-center space-x-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-glow"
            >
              <span className="text-white font-bold text-lg">S</span>
            </motion.div>
            <span className="font-bold text-2xl gradient-text">Yois Gaming</span>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop Navigation */}
      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        {navItems.map((item) => {
          const isActive = Boolean(pathname === item.href || (item.hasDropdown && pathname.startsWith('/games')))
          const Icon = item.icon

          // Hide items that require auth if user is not authenticated
          if (item.requiresAuth && !isAuthenticated) {
            return null
          }

          // Render dropdown for Games section
          if (item.hasDropdown && item.label === 'Games') {
            return (
              <NavbarItem key={item.href} isActive={isActive}>
                <Dropdown placement="bottom-start">
                  <DropdownTrigger>
                    <motion.div
                      whileHover={{ y: -2 }}
                      whileTap={{ y: 0 }}
                      className="cursor-pointer"
                    >
                      <div
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${isActive
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                      >
                        {Icon && <Icon />}
                        <span className="font-medium">{item.label}</span>
                        <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M7 10L12 15L17 10H7Z" />
                        </svg>
                        {item.badge && (
                          <Chip size="sm" color="primary" variant="flat">
                            {item.badge}
                          </Chip>
                        )}
                      </div>
                    </motion.div>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="Games menu"
                    className="w-80"
                    itemClasses={{
                      base: "gap-4"
                    }}
                  >
                    <DropdownSection title="Browse Games" showDivider>
                      <DropdownItem
                        key="all-games"
                        href="/games"
                        className="text-base"
                      >
                        All Games
                      </DropdownItem>
                      <DropdownItem
                        key="popular"
                        href="/games?category=popular"
                        className="text-base"
                      >
                        Popular Games
                      </DropdownItem>
                      <DropdownItem
                        key="new"
                        href="/games?category=new"
                        className="text-base"
                      >
                        New Games
                      </DropdownItem>
                    </DropdownSection>
                    <DropdownSection title="Categories" showDivider>
                      <DropdownItem
                        key="slots"
                        href="/games?category=slots"
                        className="text-base"
                      >
                        Slots
                      </DropdownItem>
                      <DropdownItem
                        key="skill"
                        href="/games?category=skill"
                        className="text-base"
                      >
                        Skill Games
                      </DropdownItem>
                      <DropdownItem
                        key="crash"
                        href="/games?category=crash"
                        className="text-base"
                      >
                        Crash Games
                      </DropdownItem>
                    </DropdownSection>
                    <DropdownSection title="Popular Games">
                      {popularGames.slice(0, 3).map((game) => (
                        <DropdownItem
                          key={game.id}
                          href={`/games/${game.id}`}
                          className="text-sm"
                          description={`${game.playerCount} players online`}
                        >
                          {game.title}
                        </DropdownItem>
                      ))}
                    </DropdownSection>
                  </DropdownMenu>
                </Dropdown>
              </NavbarItem>
            )
          }

          return (
            <NavbarItem key={item.href} isActive={isActive}>
              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                <Link
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${isActive
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                  {Icon && <Icon />}
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <Chip size="sm" color="primary" variant="flat">
                      {item.badge}
                    </Chip>
                  )}
                </Link>
              </motion.div>
            </NavbarItem>
          )
        })}
      </NavbarContent>

      {/* Authentication Actions */}
      <NavbarContent justify="end">
        {isAuthenticated && user ? (
          <div className="flex items-center space-x-4">
            {/* Balance Display */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="hidden md:flex items-center space-x-2 bg-card border border-border rounded-lg px-3 py-2 cursor-pointer"
              onClick={() => openModal('wallet')}
              title="Click to open wallet"
            >
              <WalletIcon />
              <span className="font-semibold text-success">
                {walletLoading ? '$---.--' : formatBalance(typeof balance === 'number' ? balance : 0)}
              </span>
            </motion.div>

            {/* User Menu */}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button
                  variant="ghost"
                  className="p-0 h-auto bg-transparent"
                  isIconOnly
                >
                  <Badge
                    content={user.level}
                    color="primary"
                    size="sm"
                    placement="bottom-right"
                  >
                    <Avatar
                      src={(user as any).avatar}
                      name={user.username}
                      size="sm"
                      className="ring-2 ring-primary/30 hover:ring-primary/50 transition-all"
                    />
                  </Badge>
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="User menu"
                className="w-64"
                itemClasses={{
                  base: "gap-4"
                }}
              >
                <DropdownItem
                  key="profile"
                  className="h-14"
                  textValue={user.username}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={(user as any).avatar}
                      name={user.username}
                      size="sm"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold">{user.username}</span>
                      <span className="text-sm text-muted-foreground">
                        Level {user.level}
                      </span>
                    </div>
                  </div>
                </DropdownItem>
                <DropdownItem
                  key="balance"
                  className="md:hidden"
                  startContent={<WalletIcon />}
                >
                  <div className="flex justify-between items-center">
                    <span>Balance</span>
                    <span className="font-semibold text-success">
                      {walletLoading ? '$---.--' : formatBalance(typeof balance === 'number' ? balance : 0)}
                    </span>
                  </div>
                </DropdownItem>
                <DropdownItem
                  key="profile-page"
                  startContent={<ProfileIcon />}
                  onClick={handleProfile}
                >
                  My Profile
                </DropdownItem>
                <DropdownItem
                  key="settings"
                  startContent={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
                    </svg>
                  }
                >
                  Settings
                </DropdownItem>
                <DropdownItem
                  key="logout"
                  color="danger"
                  startContent={
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" />
                    </svg>
                  }
                  onClick={handleLogout}
                >
                  Sign Out
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              onPress={handleLogin}
              className="hidden sm:flex"
            >
              Sign In
            </Button>
            <Button
              color="primary"
              onPress={handleRegister}
              className="gaming-button"
            >
              Sign Up
            </Button>
          </div>
        )}
      </NavbarContent>

      {/* Mobile Menu */}
      <NavbarMenu className="bg-dark-700/95 backdrop-blur-md border-r border-border/50">
        <div className="flex flex-col space-y-2 pt-4">
          {navItems.map((item) => {
            const isActive = Boolean(pathname === item.href)
            const Icon = item.icon

            // Hide items that require auth if user is not authenticated
            if (item.requiresAuth && !isAuthenticated) {
              return null
            }

            return (
              <NavbarMenuItem key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${isActive
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                >
                  {Icon && <Icon />}
                  <span className="font-medium">{item.label}</span>
                  {item.badge && (
                    <Chip size="sm" color="primary" variant="flat">
                      {item.badge}
                    </Chip>
                  )}
                </Link>
              </NavbarMenuItem>
            )
          })}

          {!isAuthenticated && (
            <>
              <div className="border-t border-border/50 my-4" />
              <NavbarMenuItem>
                <Button
                  variant="ghost"
                  fullWidth
                  onPress={handleLogin}
                  className="justify-start"
                >
                  Sign In
                </Button>
              </NavbarMenuItem>
              <NavbarMenuItem>
                <Button
                  color="primary"
                  fullWidth
                  onPress={handleRegister}
                  className="gaming-button justify-start"
                >
                  Sign Up
                </Button>
              </NavbarMenuItem>
            </>
          )}
        </div>
      </NavbarMenu>
    </Navbar>
  )
}