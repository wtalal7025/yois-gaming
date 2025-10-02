/**
 * Mines Game Statistics Component
 * Displays game history, statistics, and current game information
 */

'use client'

import React from 'react'
import type { MinesResult, MinesGameState } from '@yois-games/shared'

/**
 * Props for MinesStats component
 */
interface MinesStatsProps {
  gameHistory: MinesResult[]
  currentBalance: number
  currentGame: MinesGameState | null
}

/**
 * Individual game history entry component
 */
interface GameHistoryEntryProps {
  game: MinesResult
  index: number
}

function GameHistoryEntry({ game, index }: GameHistoryEntryProps) {
  const isWin = game.status === 'win'
  const profit = game.payout - game.betAmount

  return (
    <div className="flex items-center justify-between p-2 bg-gray-700 rounded text-sm">
      <div className="flex items-center space-x-2">
        <span className="text-gray-400">#{index + 1}</span>
        <span className={`px-2 py-1 rounded text-xs ${isWin ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
          {isWin ? 'WIN' : 'LOSS'}
        </span>
      </div>
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-gray-300">{game.config.mineCount}m</span>
        <span className="text-gray-300">{game.revealedSafeTiles}t</span>
        <span className={`font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
          {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
        </span>
      </div>
    </div>
  )
}

/**
 * Main stats component
 */
export function MinesStats({ gameHistory, currentBalance, currentGame }: MinesStatsProps) {
  // Calculate statistics
  const totalGames = gameHistory.length
  const wonGames = gameHistory.filter(game => game.status === 'win').length
  const lostGames = totalGames - wonGames
  const winRate = totalGames > 0 ? (wonGames / totalGames * 100) : 0

  const totalWagered = gameHistory.reduce((sum, game) => sum + game.betAmount, 0)
  const totalWon = gameHistory.reduce((sum, game) => sum + game.payout, 0)
  const netProfit = totalWon - totalWagered

  const biggestWin = gameHistory.reduce((max, game) => {
    const profit = game.payout - game.betAmount
    return profit > max ? profit : max
  }, 0)

  const averageMultiplier = wonGames > 0
    ? gameHistory.filter(game => game.status === 'win').reduce((sum, game) => sum + game.multiplier, 0) / wonGames
    : 0

  // Recent games (last 10)
  const recentGames = gameHistory.slice(-10).reverse()

  return (
    <div className="space-y-4">
      {/* Current Game Status */}
      {currentGame && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">Current Game</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Bet Amount:</span>
              <span className="text-white">${currentGame.betAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Mines:</span>
              <span className="text-white">{currentGame.mineCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tiles Revealed:</span>
              <span className="text-white">{currentGame.revealedTiles.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Current Multiplier:</span>
              <span className="text-green-400 font-semibold">{currentGame.currentMultiplier.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Potential Payout:</span>
              <span className="text-yellow-400 font-semibold">${currentGame.potentialPayout.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Overall Statistics */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-white mb-3">Statistics</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Balance:</span>
            <div className="text-lg font-semibold text-green-400">${currentBalance.toFixed(2)}</div>
          </div>
          <div>
            <span className="text-gray-400">Total Games:</span>
            <div className="text-lg font-semibold text-white">{totalGames}</div>
          </div>
          <div>
            <span className="text-gray-400">Win Rate:</span>
            <div className="text-lg font-semibold text-green-400">{winRate.toFixed(1)}%</div>
          </div>
          <div>
            <span className="text-gray-400">Net Profit:</span>
            <div className={`text-lg font-semibold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
              {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-white mb-3">Detailed Stats</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Games Won:</span>
            <span className="text-green-400">{wonGames}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Games Lost:</span>
            <span className="text-red-400">{lostGames}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Wagered:</span>
            <span className="text-white">${totalWagered.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Won:</span>
            <span className="text-white">${totalWon.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Biggest Win:</span>
            <span className="text-green-400">${biggestWin.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Avg. Multiplier:</span>
            <span className="text-blue-400">{averageMultiplier.toFixed(2)}x</span>
          </div>
        </div>
      </div>

      {/* Game History */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-white mb-3">Recent Games</h4>
        {recentGames.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentGames.map((game, index) => (
              <GameHistoryEntry
                key={game.gameId}
                game={game}
                index={gameHistory.length - index - 1}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">📊</div>
            <p className="text-gray-400 text-sm">No games played yet</p>
            <p className="text-gray-500 text-xs">Start playing to see your statistics</p>
          </div>
        )}
      </div>

      {/* Legend */}
      {recentGames.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-3">
          <h5 className="text-sm font-medium text-white mb-2">Legend</h5>
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <span>m = mines</span>
            <span>t = tiles revealed</span>
            <span className="text-green-400">GREEN = profit</span>
            <span className="text-red-400">RED = loss</span>
          </div>
        </div>
      )}

      {/* Responsible Gaming Reminder */}
      <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-3">
        <div className="text-xs text-blue-200">
          🎯 <strong>Remember:</strong> Set limits and play responsibly. The house always has an edge in the long run.
        </div>
      </div>
    </div>
  )
}