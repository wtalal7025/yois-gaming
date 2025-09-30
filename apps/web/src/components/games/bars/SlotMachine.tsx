/**
 * SlotMachine Component
 * Displays the 3x3 reel grid with spinning animations
 */

'use client'

import React from 'react'
import type { BarsReel, BarsSymbol } from '@stake-games/shared'

/**
 * Props for SlotMachine component
 */
interface SlotMachineProps {
  reels: BarsReel[]
  isSpinning: boolean
  turboMode: boolean
}

/**
 * Symbol display component with emoji representation
 */
interface SymbolDisplayProps {
  symbol: BarsSymbol
  isWinning: boolean
  isSpinning: boolean
  animationDelay?: number
}

const SymbolDisplay: React.FC<SymbolDisplayProps> = ({ 
  symbol, 
  isWinning, 
  isSpinning, 
  animationDelay = 0 
}) => {
  // Symbol to emoji mapping for visual representation
  const getSymbolEmoji = (sym: BarsSymbol): string => {
    const symbolMap: Record<BarsSymbol, string> = {
      'triple-bar': '🔶',
      'double-bar': '🔸',
      'single-bar': '▫️',
      'seven': '7️⃣',
      'bell': '🔔',
      'cherry': '🍒',
      'lemon': '🍋',
      'orange': '🍊',
      'plum': '🟣',
      'grape': '🍇'
    }
    return symbolMap[sym] || '❓'
  }

  // Symbol display name for accessibility
  const getSymbolName = (sym: BarsSymbol): string => {
    const nameMap: Record<BarsSymbol, string> = {
      'triple-bar': 'Triple BAR',
      'double-bar': 'Double BAR',
      'single-bar': 'Single BAR',
      'seven': 'Seven',
      'bell': 'Bell',
      'cherry': 'Cherry',
      'lemon': 'Lemon',
      'orange': 'Orange',
      'plum': 'Plum',
      'grape': 'Grape'
    }
    return nameMap[sym] || 'Unknown'
  }

  const baseClasses = `
    flex items-center justify-center
    w-full h-full
    text-4xl font-bold
    transition-all duration-300
    border-2 border-gray-300
    rounded-lg
    select-none
  `

  const stateClasses = isWinning 
    ? 'bg-yellow-200 border-yellow-500 animate-pulse shadow-lg transform scale-105' 
    : 'bg-white hover:bg-gray-50'

  const spinClasses = isSpinning 
    ? 'animate-spin blur-sm opacity-70' 
    : ''

  return (
    <div 
      className={`${baseClasses} ${stateClasses} ${spinClasses}`}
      style={{ 
        animationDelay: isSpinning ? `${animationDelay}ms` : '0ms' 
      }}
      title={getSymbolName(symbol)}
      role="img"
      aria-label={getSymbolName(symbol)}
    >
      {getSymbolEmoji(symbol)}
    </div>
  )
}

/**
 * Main SlotMachine component
 */
export const SlotMachine: React.FC<SlotMachineProps> = ({ 
  reels, 
  isSpinning, 
  turboMode 
}) => {
  // Calculate animation delays for staggered reel stopping
  const getAnimationDelay = (reelIndex: number): number => {
    if (!isSpinning) return 0
    
    const baseDelay = turboMode ? 100 : 200
    const col = reelIndex % 3
    return col * baseDelay
  }

  // Get reel column (0, 1, 2) from reel ID for staggered animations
  const getReelColumn = (reelId: number): number => {
    return reelId % 3
  }

  return (
    <div className="relative">
      {/* Slot Machine Frame */}
      <div className="bg-gradient-to-b from-yellow-600 via-yellow-500 to-yellow-700 p-6 rounded-xl shadow-2xl border-4 border-yellow-800">
        {/* Machine Header */}
        <div className="text-center mb-4">
          <h3 className="text-2xl font-bold text-yellow-100 tracking-wider">
            🎰 BARS 🎰
          </h3>
          <div className="h-1 bg-gradient-to-r from-transparent via-yellow-300 to-transparent rounded"></div>
        </div>

        {/* 3x3 Reel Grid */}
        <div className="grid grid-cols-3 gap-2 bg-gray-800 p-4 rounded-lg">
          {Array.from({ length: 9 }, (_, index) => {
            const reel = reels.find(r => r.id === index)
            if (!reel) return null

            const column = getReelColumn(index)
            const animationDelay = getAnimationDelay(column)

            return (
              <div
                key={index}
                className="aspect-square relative overflow-hidden"
              >
                {/* Spinning Overlay Effect */}
                {isSpinning && (
                  <div 
                    className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent animate-pulse"
                    style={{ 
                      animationDelay: `${animationDelay}ms`,
                      animationDuration: turboMode ? '200ms' : '400ms'
                    }}
                  />
                )}

                {/* Symbol Display */}
                <SymbolDisplay
                  symbol={reel.symbol}
                  isWinning={reel.isWinning}
                  isSpinning={isSpinning}
                  animationDelay={animationDelay}
                />

                {/* Position Label (for debugging - can be removed in production) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="absolute top-0 left-0 text-xs text-gray-500 bg-white/80 px-1 rounded">
                    {index}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Machine Status Indicator */}
        <div className="flex justify-center items-center mt-4 space-x-2">
          <div 
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              isSpinning ? 'bg-red-500 animate-pulse' : 'bg-green-500'
            }`}
          />
          <span className="text-yellow-100 text-sm font-medium">
            {isSpinning ? (turboMode ? 'TURBO SPIN' : 'SPINNING') : 'READY'}
          </span>
        </div>

        {/* Decorative Elements */}
        <div className="flex justify-between items-center mt-2">
          <div className="w-8 h-8 bg-yellow-400 rounded-full border-2 border-yellow-600 flex items-center justify-center">
            <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
          </div>
          <div className="text-yellow-200 text-xs font-mono tracking-wider">
            SLOT MACHINE
          </div>
          <div className="w-8 h-8 bg-yellow-400 rounded-full border-2 border-yellow-600 flex items-center justify-center">
            <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Win Flash Effect */}
      {reels.some(reel => reel.isWinning) && !isSpinning && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-yellow-400/20 rounded-xl animate-ping"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/50 to-transparent rounded-xl animate-pulse"></div>
        </div>
      )}

      {/* Spinning Particles Effect */}
      {isSpinning && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-bounce opacity-60"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 150}ms`,
                animationDuration: turboMode ? '600ms' : '1000ms'
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}