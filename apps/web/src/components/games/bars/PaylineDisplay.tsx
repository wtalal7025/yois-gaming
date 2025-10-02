/**
 * PaylineDisplay Component
 * Shows active paylines and highlights winning lines
 */

'use client'

import React from 'react'
import type { BarsPayline, BarsPaylineWin, BarsReel } from '@yois-games/shared'

/**
 * Props for PaylineDisplay component
 */
interface PaylineDisplayProps {
  paylines: BarsPayline[]
  winningPaylines: BarsPaylineWin[]
  reels: BarsReel[]
}

/**
 * Individual payline indicator component
 */
interface PaylineIndicatorProps {
  payline: BarsPayline
  isWinning: boolean
  winAmount?: number
}

const PaylineIndicator: React.FC<PaylineIndicatorProps> = ({
  payline,
  isWinning,
  winAmount
}) => {
  // Color scheme for each payline
  const getPaylineColor = (paylineId: number): string => {
    const colors = {
      1: 'rgb(239, 68, 68)', // red-500
      2: 'rgb(59, 130, 246)', // blue-500
      3: 'rgb(34, 197, 94)', // green-500
      4: 'rgb(251, 191, 36)', // yellow-500
      5: 'rgb(168, 85, 247)' // purple-500
    }
    return colors[paylineId as keyof typeof colors] || 'rgb(107, 114, 128)' // gray-500
  }

  const color = getPaylineColor(payline.id)
  const isActive = payline.isActive

  return (
    <div
      className={`
        flex items-center justify-between px-2 py-1 rounded-md text-xs font-medium
        transition-all duration-200
        ${isActive ? 'opacity-100' : 'opacity-50'}
        ${isWinning ? 'animate-pulse shadow-lg scale-105' : ''}
      `}
      style={{
        backgroundColor: isActive ? `${color}20` : `${color}10`,
        borderColor: color,
        borderWidth: isWinning ? '2px' : '1px',
        borderStyle: 'solid'
      }}
    >
      {/* Payline Info */}
      <div className="flex items-center space-x-2">
        <div
          className="w-3 h-3 rounded-full border border-white"
          style={{ backgroundColor: color }}
        />
        <span style={{ color: isActive ? color : `${color}80` }}>
          Line {payline.id}
        </span>
      </div>

      {/* Bet Amount or Win Amount */}
      <div className="text-right">
        {isWinning && winAmount ? (
          <div className="text-yellow-600 font-bold">
            +${winAmount.toFixed(2)}
          </div>
        ) : (
          <div className="text-gray-500">
            ${payline.betAmount.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Payline path overlay for visual representation
 */
interface PaylinePathProps {
  payline: BarsPayline
  isWinning: boolean
}

const PaylinePath: React.FC<PaylinePathProps> = ({ payline, isWinning }) => {
  const getPaylineColor = (paylineId: number): string => {
    const colors = {
      1: 'rgb(239, 68, 68)', // red-500
      2: 'rgb(59, 130, 246)', // blue-500
      3: 'rgb(34, 197, 94)', // green-500
      4: 'rgb(251, 191, 36)', // yellow-500
      5: 'rgb(168, 85, 247)' // purple-500
    }
    return colors[paylineId as keyof typeof colors] || 'rgb(107, 114, 128)'
  }

  // Get SVG path for payline based on positions
  const getPathString = (positions: [number, number, number]): string => {
    // Convert grid positions to SVG coordinates (3x3 grid within 300x300 viewBox)
    const getCoords = (pos: number): [number, number] => {
      const row = Math.floor(pos / 3)
      const col = pos % 3
      return [col * 100 + 50, row * 100 + 50] // Center of each cell
    }

    const [start, middle, end] = positions.map(getCoords)

    return `M ${start[0]} ${start[1]} L ${middle[0]} ${middle[1]} L ${end[0]} ${end[1]}`
  }

  const color = getPaylineColor(payline.id)
  const pathString = getPathString(payline.positions)
  const strokeWidth = isWinning ? 6 : 3
  const opacity = payline.isActive ? (isWinning ? 1 : 0.7) : 0.3

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox="0 0 300 300"
      style={{ opacity }}
    >
      {/* Shadow/Glow effect for winning lines */}
      {isWinning && (
        <path
          d={pathString}
          stroke={color}
          strokeWidth={strokeWidth + 4}
          fill="none"
          opacity={0.3}
          className="animate-pulse"
        />
      )}

      {/* Main payline path */}
      <path
        d={pathString}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isWinning ? 'animate-pulse' : ''}
      />

      {/* Payline markers at each position */}
      {payline.positions.map((pos, index) => {
        const row = Math.floor(pos / 3)
        const col = pos % 3
        const x = col * 100 + 50
        const y = row * 100 + 50

        return (
          <circle
            key={`${payline.id}-${index}`}
            cx={x}
            cy={y}
            r={isWinning ? 8 : 5}
            fill={color}
            stroke="white"
            strokeWidth={2}
            className={isWinning ? 'animate-pulse' : ''}
          />
        )
      })}
    </svg>
  )
}

/**
 * Main PaylineDisplay component
 */
export const PaylineDisplay: React.FC<PaylineDisplayProps> = ({
  paylines,
  winningPaylines,
  reels
}) => {
  // Get win amount for a specific payline
  const getWinAmount = (paylineId: number): number => {
    const win = winningPaylines.find(w => w.paylineId === paylineId)
    return win?.totalPayout || 0
  }

  // Check if payline is winning
  const isPaylineWinning = (paylineId: number): boolean => {
    return winningPaylines.some(w => w.paylineId === paylineId)
  }

  return (
    <div className="space-y-4">
      {/* Payline Visual Overlay */}
      <div className="relative">
        {/* Background grid for reference */}
        <div className="aspect-square bg-gray-100 rounded-lg border-2 border-gray-300 relative overflow-hidden">
          {/* 3x3 grid overlay */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1 p-2">
            {Array.from({ length: 9 }, (_, index) => (
              <div
                key={index}
                className="bg-white/50 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-400"
              >
                {index}
              </div>
            ))}
          </div>

          {/* Payline paths */}
          {paylines.map(payline => (
            <PaylinePath
              key={payline.id}
              payline={payline}
              isWinning={isPaylineWinning(payline.id)}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="absolute -top-2 -right-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          <div className="text-xs font-semibold text-gray-700 mb-1">
            Paylines
          </div>
          <div className="space-y-1">
            {paylines.map(payline => (
              <div key={payline.id} className="flex items-center space-x-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ['', 'rgb(239, 68, 68)', 'rgb(59, 130, 246)', 'rgb(34, 197, 94)', 'rgb(251, 191, 36)', 'rgb(168, 85, 247)'][payline.id]
                  }}
                />
                <span className="text-xs">{payline.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payline Status List */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-gray-700">
          Active Paylines ({paylines.filter(p => p.isActive).length}/5)
        </h4>

        <div className="space-y-1">
          {paylines.map(payline => (
            <PaylineIndicator
              key={payline.id}
              payline={payline}
              isWinning={isPaylineWinning(payline.id)}
              winAmount={getWinAmount(payline.id)}
            />
          ))}
        </div>
      </div>

      {/* Winning Summary */}
      {winningPaylines.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <div className="text-yellow-600 font-bold">🎉 Winning Lines!</div>
          </div>
          <div className="space-y-1">
            {winningPaylines.map(win => (
              <div key={win.paylineId} className="flex justify-between text-sm">
                <span>
                  Line {win.paylineId}: {win.matchCount} × {win.symbol.toUpperCase()}
                </span>
                <span className="font-bold text-green-600">
                  +${win.totalPayout.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-yellow-300 mt-2 pt-2">
            <div className="flex justify-between font-bold">
              <span>Total Win:</span>
              <span className="text-green-600">
                +${winningPaylines.reduce((sum, win) => sum + win.totalPayout, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Payline Descriptions */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>Line 1: Top row (0-1-2)</div>
        <div>Line 2: Middle row (3-4-5)</div>
        <div>Line 3: Bottom row (6-7-8)</div>
        <div>Line 4: Diagonal down (0-4-8)</div>
        <div>Line 5: Diagonal up (6-4-2)</div>
      </div>
    </div>
  )
}