/**
 * Mines Game Board Component
 * Renders the interactive 5x5 grid for the Mines game
 */

'use client'

import React from 'react'
import type { MinesGameState, MinesTile } from '@yois-games/shared'

/**
 * Props for MinesBoard component
 */
interface MinesBoardProps {
  gameState: MinesGameState
  onTileReveal: (tileId: number) => void
  disabled?: boolean
}

/**
 * Individual tile component
 */
interface TileProps {
  tile: MinesTile
  onReveal: (tileId: number) => void
  disabled: boolean
}

function Tile({ tile, onReveal, disabled }: TileProps) {
  const handleClick = () => {
    if (disabled || tile.isRevealed || tile.isFlagged) return
    onReveal(tile.id)
  }

  const getTileClass = () => {
    const baseClass = "w-12 h-12 border-2 rounded-lg flex items-center justify-center text-sm font-semibold transition-all duration-200 cursor-pointer hover:scale-105"

    if (tile.isRevealed) {
      if (tile.hasMine) {
        return `${baseClass} bg-red-500 border-red-600 text-white cursor-not-allowed hover:scale-100`
      } else {
        return `${baseClass} bg-green-500 border-green-600 text-white cursor-not-allowed hover:scale-100`
      }
    }

    if (tile.isFlagged) {
      return `${baseClass} bg-yellow-500 border-yellow-600 text-white cursor-pointer`
    }

    if (disabled) {
      return `${baseClass} bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed hover:scale-100`
    }

    return `${baseClass} bg-gray-800 border-gray-600 text-white hover:bg-gray-700`
  }

  const getTileContent = () => {
    if (tile.isRevealed) {
      if (tile.hasMine) {
        return '💣'
      } else if (tile.multiplier) {
        return `${tile.multiplier.toFixed(2)}x`
      } else {
        return '✓'
      }
    }

    if (tile.isFlagged) {
      return '🚩'
    }

    return ''
  }

  return (
    <button
      className={getTileClass()}
      onClick={handleClick}
      disabled={disabled || tile.isRevealed}
      type="button"
    >
      {getTileContent()}
    </button>
  )
}

/**
 * Main board component
 */
export function MinesBoard({ gameState, onTileReveal, disabled = false }: MinesBoardProps) {
  // Organize tiles into 5x5 grid
  const grid = Array(5).fill(null).map((_, row) =>
    Array(5).fill(null).map((_, col) =>
      gameState.tiles.find(tile => tile.row === row && tile.col === col)
    )
  )

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Game info */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="bg-gray-800 px-3 py-1 rounded">
          <span className="text-gray-400">Mines:</span>
          <span className="text-white ml-1 font-semibold">{gameState.mineCount}</span>
        </div>
        <div className="bg-gray-800 px-3 py-1 rounded">
          <span className="text-gray-400">Revealed:</span>
          <span className="text-white ml-1 font-semibold">{gameState.revealedTiles.length}</span>
        </div>
        <div className="bg-gray-800 px-3 py-1 rounded">
          <span className="text-gray-400">Multiplier:</span>
          <span className="text-green-400 ml-1 font-semibold">{gameState.currentMultiplier.toFixed(2)}x</span>
        </div>
        <div className="bg-gray-800 px-3 py-1 rounded">
          <span className="text-gray-400">Potential:</span>
          <span className="text-yellow-400 ml-1 font-semibold">${gameState.potentialPayout.toFixed(2)}</span>
        </div>
      </div>

      {/* 5x5 Game Grid */}
      <div className="grid grid-cols-5 gap-2 p-4 bg-gray-900 rounded-lg">
        {grid.map((row, rowIndex) =>
          row.map((tile, colIndex) => {
            if (!tile) return null
            return (
              <Tile
                key={`${rowIndex}-${colIndex}`}
                tile={tile}
                onReveal={onTileReveal}
                disabled={disabled}
              />
            )
          })
        )}
      </div>

      {/* Game status */}
      <div className="text-center">
        {gameState.gameStatus === 'playing' && (
          <p className="text-gray-400">Click tiles to reveal them</p>
        )}
        {gameState.gameStatus === 'lost' && (
          <p className="text-red-400 font-semibold">Game Over! You hit a mine 💥</p>
        )}
        {gameState.gameStatus === 'won' && (
          <p className="text-green-400 font-semibold">Congratulations! You won! 🎉</p>
        )}
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-500 text-center max-w-md">
        <p>Left click to reveal tiles. Avoid the mines and cash out before it's too late!</p>
      </div>
    </div>
  )
}