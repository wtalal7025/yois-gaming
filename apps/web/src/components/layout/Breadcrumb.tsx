'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Breadcrumbs, BreadcrumbItem } from '@heroui/react'

// Home icon for the root breadcrumb
const HomeIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
)

// Game icons for game-specific breadcrumbs
const gameIcons: Record<string, string> = {
  'sugar-rush': '🍭',
  'mines': '💣', 
  'bars': '🎰',
  'dragon-tower': '🐉',
  'crash': '🚀',
  'limbo': '🎲'
}

// Route name mappings for better display names
const routeNameMap: Record<string, string> = {
  'games': 'Games',
  'leaderboards': 'Leaderboards', 
  'profile': 'Profile',
  'wallet': 'Wallet',
  'settings': 'Settings',
  'help': 'Help',
  'sugar-rush': 'Sugar Rush',
  'mines': 'Mines',
  'bars': 'Bars',
  'dragon-tower': 'Dragon Tower',
  'crash': 'Crash',
  'limbo': 'Limbo',
  'statistics': 'Statistics',
  'tournament': 'Tournament',
  'history': 'History',
  'deposits': 'Deposits',
  'withdrawals': 'Withdrawals'
}

interface BreadcrumbProps {
  className?: string
  showHome?: boolean
}

export function Breadcrumb({ className = '', showHome = true }: BreadcrumbProps) {
  const pathname = usePathname()
  
  // Don't show breadcrumbs on the home page
  if (pathname === '/') {
    return null
  }

  // Split path into segments and filter empty ones
  const pathSegments = pathname.split('/').filter(Boolean)
  
  // Create breadcrumb items
  const breadcrumbItems = []
  
  // Add home if requested
  if (showHome) {
    breadcrumbItems.push({
      label: 'Home',
      href: '/',
      isLast: pathSegments.length === 0,
      icon: HomeIcon
    })
  }

  // Add path segments
  pathSegments.forEach((segment, index) => {
    const href = '/' + pathSegments.slice(0, index + 1).join('/')
    const isLast = index === pathSegments.length - 1
    const displayName = routeNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    const gameIcon = gameIcons[segment]
    
    breadcrumbItems.push({
      label: displayName,
      href,
      isLast,
      gameIcon
    })
  })

  // Don't render if only one item (just home)
  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <motion.div 
      className={`mb-6 ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Breadcrumbs 
        variant="solid"
        className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-2"
        itemClasses={{
          item: "text-muted-foreground data-[current=true]:text-foreground",
          separator: "text-muted-foreground/50"
        }}
      >
        {breadcrumbItems.map((item, index) => {
          const Icon = item.icon
          
          return (
            <BreadcrumbItem
              key={item.href}
              isCurrent={item.isLast}
              className="flex items-center space-x-2"
            >
              {item.isLast ? (
                // Current page (not clickable)
                <div className="flex items-center space-x-2">
                  {Icon && <Icon />}
                  {item.gameIcon && (
                    <span className="text-sm">{item.gameIcon}</span>
                  )}
                  <span className="font-medium">{item.label}</span>
                </div>
              ) : (
                // Clickable breadcrumb
                <Link 
                  href={item.href}
                  className="flex items-center space-x-2 hover:text-primary transition-colors"
                >
                  {Icon && <Icon />}
                  {item.gameIcon && (
                    <span className="text-sm">{item.gameIcon}</span>
                  )}
                  <span>{item.label}</span>
                </Link>
              )}
            </BreadcrumbItem>
          )
        })}
      </Breadcrumbs>
    </motion.div>
  )
}

// Breadcrumb wrapper component for page layouts
export function PageBreadcrumb({ 
  className,
  showHome = true 
}: BreadcrumbProps) {
  return (
    <div className={`container mx-auto px-6 ${className || ''}`}>
      <Breadcrumb showHome={showHome} />
    </div>
  )
}