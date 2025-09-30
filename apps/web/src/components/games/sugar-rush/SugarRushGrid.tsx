/**
 * Sugar Rush Game Grid Component
 * Displays the 7x7 grid of candy symbols with animations
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SugarRushGameState, SugarRushCell, SugarRushSymbol } from '@stake-games/shared'

/**
 * Props for SugarRushGrid component
 */
interface SugarRushGridProps {
  gameState: SugarRushGameState
  cascadeAnimation: boolean
  disabled?: boolean
}

/**
 * Symbol component with candy styling
 */
interface SugarRushSymbolProps {
  symbol: SugarRushSymbol
  cell: SugarRushCell
  cascadeAnimation: boolean
  disabled: boolean
}

const SugarRushSymbolComponent = ({ symbol, cell, cascadeAnimation, disabled }: SugarRushSymbolProps) => {
  const getSymbolEmoji = (symbol: SugarRushSymbol): string => {
    const symbols = {
      'red-candy': '🍎',
      'orange-candy': '🍊', 
      'yellow-candy': '🍌',
      'green-candy': '🍏',
      'blue-candy': '🫐',
      'purple-candy': '🍇',
      'pink-candy': '🍑',
      'wild': '🌟'
    }
    return symbols[symbol] || '🍭'
  }

  const getSymbolColor = (symbol: SugarRushSymbol): string => {
    const colors = {
      'red-candy': 'from-red-400 to-red-600',
      'orange-candy': 'from-orange-400 to-orange-600',
      'yellow-candy': 'from-yellow-400 to-yellow-600', 
      'green-candy': 'from-green-400 to-green-600',
      'blue-candy': 'from-blue-400 to-blue-600',
      'purple-candy': 'from-purple-400 to-purple-600',
      'pink-candy': 'from-pink-400 to-pink-600',
      'wild': 'from-yellow-300 to-amber-500'
    }
    return colors[symbol] || 'from-gray-400 to-gray-600'
  }

  const baseClasses = `
    relative w-full h-full rounded-xl flex items-center justify-center text-4xl
    transition-all duration-300 cursor-pointer transform hover:scale-105
    bg-gradient-to-br ${getSymbolColor(symbol)}
    border-2 border-white/20 shadow-lg
  `

  const stateClasses = {
    normal: 'opacity-100',
    matched: cascadeAnimation ? 'opacity-0 scale-0' : 'opacity-100 ring-4 ring-yellow-400 animate-pulse',
    falling: 'opacity-100',
    exploding: 'opacity-0 scale-150'
  }

  return (
    <motion.div
      className={`${baseClasses} ${stateClasses[cell.state]} ${disabled ? 'pointer-events-none' : ''}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: cell.state === 'matched' && cascadeAnimation ? 0 : 1, 
        opacity: cell.state === 'matched' && cascadeAnimation ? 0 : 1 
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 20,
        duration: cell.state === 'falling' ? 0.8 : 0.3
      }}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
    >
      <span className="drop-shadow-lg filter">
        {getSymbolEmoji(symbol)}
      </span>
      
      {cell.isMatched && !cascadeAnimation && (
        <motion.div
          className="absolute inset-0 bg-yellow-400/30 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      {symbol === 'wild' && (
        <motion.div
          className="absolute inset-0 border-2 border-yellow-400 rounded-xl"
          animate={{ 
            boxShadow: [
              '0 0 5px rgba(250, 204, 21, 0.5)',
              '0 0 20px rgba(250, 204, 21, 0.8)',
              '0 0 5px rgba(250, 204, 21, 0.5)'
            ]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {cell.multiplier && cell.multiplier > 1 && (
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {cell.multiplier}x
        </div>
      )}
    </motion.div>
  )
}

/**
 * Main grid component
 */
export function SugarRushGrid({ gameState, cascadeAnimation, disabled = false }: SugarRushGridProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-7 gap-2 p-4 bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl border border-white/10">
        <AnimatePresence mode="popLayout">
          {gameState.grid.map((cell) => (
            <motion.div
              key={`${cell.id}-${cell.symbol}`}
              className="aspect-square"
              layout
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 30,
                delay: cell.state === 'falling' ? cell.row * 0.05 : 0
              }}
            >
              <SugarRushSymbolComponent
                symbol={cell.symbol}
                cell={cell}
                cascadeAnimation={cascadeAnimation}
                disabled={disabled}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Game Status Indicators */}
      {gameState.currentCascadeLevel > 0 && (
        <motion.div
          className="mt-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full">
            <span className="text-sm font-medium">Cascade Level:</span>
            <span className="text-lg font-bold">{gameState.currentCascadeLevel}</span>
          </div>
        </motion.div>
      )}

      {/* Multiplier Display */}
      {gameState.totalMultiplier > 1 && (
        <motion.div
          className="mt-2 text-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-full shadow-lg">
            <span className="text-sm font-medium">Total Multiplier:</span>
            <span className="text-2xl font-bold">{gameState.totalMultiplier}x</span>
          </div>
        </motion.div>
      )}

      {/* Win Amount Display */}
      {gameState.totalPayout > 0 && (
        <motion.div
          className="mt-2 text-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
        >
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-full shadow-lg">
            <span className="text-sm font-medium">Total Win:</span>
            <span className="text-2xl font-bold">${gameState.totalPayout.toFixed(2)}</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}