/**
 * Universal Game Container Component
 * Provides consistent layout, navigation, and controls for all games
 */

'use client'

import React, { useState, useEffect } from 'react'
import { 
  Card, 
  CardBody, 
  Button, 
  Dropdown, 
  DropdownTrigger, 
  DropdownMenu, 
  DropdownItem,
  Chip,
  Divider 
} from '@heroui/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  ArrowLeftIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  QuestionMarkCircleIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { getGameInfo } from '../../../lib/gameRegistry'
import type { GameType } from '@stake-games/shared'

/**
 * Props for GameContainer component
 */
interface GameContainerProps {
  gameId: GameType
  children: React.ReactNode
  className?: string
}

/**
 * Game Container component with universal layout and controls
 * Reason: Provides consistent UX across all games with common controls and navigation
 */
export function GameContainer({ gameId, children, className = '' }: GameContainerProps) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const gameInfo = getGameInfo(gameId)

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.warn('Fullscreen not supported or failed:', error)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Load sound preference from localStorage
  useEffect(() => {
    const savedSoundPreference = localStorage.getItem('game-sound-enabled')
    if (savedSoundPreference !== null) {
      setSoundEnabled(savedSoundPreference === 'true')
    }
  }, [])

  // Handle sound toggle
  const toggleSound = () => {
    const newSoundState = !soundEnabled
    setSoundEnabled(newSoundState)
    localStorage.setItem('game-sound-enabled', newSoundState.toString())
    
    // Dispatch custom event for games to listen to
    window.dispatchEvent(new CustomEvent('game-sound-toggle', { 
      detail: { enabled: newSoundState } 
    }))
  }

  if (!gameInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Game Not Found</h2>
          <p className="text-foreground-600">The requested game could not be found.</p>
          <Link href="/games">
            <Button color="primary">Back to Games</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-background to-default-50 ${className}`}>
      {/* Header Bar */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-default-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left Side - Navigation */}
            <div className="flex items-center gap-4">
              <Link href="/games">
                <Button
                  variant="ghost"
                  size="sm"
                  startContent={<ArrowLeftIcon className="w-4 h-4" />}
                  className="text-foreground-600 hover:text-foreground"
                >
                  Back to Games
                </Button>
              </Link>
              
              <Divider orientation="vertical" className="h-6" />
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold">
                  {gameInfo.title.charAt(0)}
                </div>
                <div>
                  <h1 className="font-bold text-foreground font-orbitron">{gameInfo.title}</h1>
                  <div className="flex items-center gap-2 text-xs text-foreground-500">
                    <Chip size="sm" variant="flat" color="primary">
                      RTP {gameInfo.rtp}%
                    </Chip>
                    <span>•</span>
                    <span className="capitalize">{gameInfo.category}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Controls */}
            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onPress={toggleSound}
                className={soundEnabled ? 'text-success' : 'text-foreground-400'}
                title={soundEnabled ? 'Disable Sound' : 'Enable Sound'}
              >
                {soundEnabled ? (
                  <SpeakerWaveIcon className="w-4 h-4" />
                ) : (
                  <SpeakerXMarkIcon className="w-4 h-4" />
                )}
              </Button>

              {/* Fullscreen Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onPress={toggleFullscreen}
                className="text-foreground-600 hover:text-foreground"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                <ArrowsPointingOutIcon className="w-4 h-4" />
              </Button>

              {/* Game Menu */}
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-foreground-600 hover:text-foreground"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="Game options">
                  <DropdownItem
                    key="rules"
                    startContent={<QuestionMarkCircleIcon className="w-4 h-4" />}
                  >
                    Game Rules
                  </DropdownItem>
                  <DropdownItem
                    key="stats"
                    startContent={<ChartBarIcon className="w-4 h-4" />}
                  >
                    Statistics
                  </DropdownItem>
                  <DropdownItem
                    key="fairness"
                    startContent={<div className="w-4 h-4 flex items-center justify-center text-xs">🔒</div>}
                  >
                    Provably Fair
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-6"
      >
        <Card className="bg-background border-1 border-default-200 shadow-lg">
          <CardBody className="p-0">
            {children}
          </CardBody>
        </Card>
      </motion.div>

      {/* Game Info Footer */}
      <div className="container mx-auto px-4 py-4">
        <Card className="bg-default-50 border-1 border-default-200">
          <CardBody className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Game Features</h4>
                <div className="flex flex-wrap gap-1">
                  {gameInfo.features.slice(0, 4).map((feature, index) => (
                    <Chip key={index} size="sm" variant="flat" className="text-xs">
                      {feature}
                    </Chip>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-2">Bet Range</h4>
                <p className="text-foreground-600">
                  ${gameInfo.minBet} - ${gameInfo.maxBet}
                </p>
                <p className="text-foreground-500 text-xs mt-1">
                  Volatility: <span className="capitalize">{gameInfo.volatility}</span>
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-2">About This Game</h4>
                <p className="text-foreground-600 text-xs leading-relaxed line-clamp-3">
                  {gameInfo.description}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}