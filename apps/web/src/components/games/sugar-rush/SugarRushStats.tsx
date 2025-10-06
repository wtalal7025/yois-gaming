/**
 * Sugar Rush Game Statistics Component
 * Displays game statistics, recent wins, and performance metrics
 */

'use client'

import React from 'react'
import { Card, CardBody, CardHeader, Progress, Chip, Divider } from '@heroui/react'
import type { SugarRushGameState, SugarRushResult } from '@yois-games/shared'

/**
 * Props for SugarRushStats component
 */
interface SugarRushStatsProps {
  gameHistory: SugarRushResult[]
  currentBalance: number
  currentGame: SugarRushGameState | null
}

/**
 * Sugar Rush statistics component
 */
export function SugarRushStats({ gameHistory, currentBalance, currentGame }: SugarRushStatsProps) {

  // Calculate statistics from game history
  const totalGames = gameHistory.length
  const gamesWon = gameHistory.filter(game => game.status === 'win').length
  const winRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0
  const totalWagered = gameHistory.reduce((sum, game) => sum + game.betAmount, 0)
  const totalWon = gameHistory.reduce((sum, game) => sum + game.payout, 0)
  const netProfit = totalWon - totalWagered
  const biggestWin = Math.max(...gameHistory.map(game => game.payout), 0)
  const averageMultiplier = gamesWon > 0
    ? gameHistory.filter(game => game.status === 'win').reduce((sum, game) => sum + game.multiplier, 0) / gamesWon
    : 0

  // Calculate win streak
  let currentWinStreak = 0
  let longestWinStreak = 0
  let tempStreak = 0

  for (let i = gameHistory.length - 1; i >= 0; i--) {
    if (gameHistory[i]?.status === 'win') {
      tempStreak++
      if (i === gameHistory.length - 1) currentWinStreak = tempStreak
    } else {
      longestWinStreak = Math.max(longestWinStreak, tempStreak)
      tempStreak = 0
    }
  }
  longestWinStreak = Math.max(longestWinStreak, tempStreak)

  // Get recent games for display
  const recentGames = gameHistory.slice(-5).reverse()

  // Calculate cascade statistics
  const cascadeStats = gameHistory.reduce((stats, game) => {
    const cascades = game.cascadeLevels || 0
    stats.totalCascades += cascades
    stats.maxCascades = Math.max(stats.maxCascades, cascades)
    if (cascades > 0) stats.gamesWithCascades++
    return stats
  }, { totalCascades: 0, maxCascades: 0, gamesWithCascades: 0 })

  const averageCascades = cascadeStats.gamesWithCascades > 0
    ? cascadeStats.totalCascades / cascadeStats.gamesWithCascades
    : 0

  return (
    <div className="space-y-4">
      {/* Main Statistics Card */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Game Statistics</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Win Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Win Rate</span>
              <span className="text-sm font-bold">{winRate.toFixed(1)}%</span>
            </div>
            <Progress
              value={winRate}
              maxValue={100}
              color={winRate >= 50 ? "success" : winRate >= 25 ? "warning" : "danger"}
              size="sm"
            />
          </div>

          {/* Games Played */}
          <div className="flex justify-between">
            <span className="text-sm text-default-500">Games Played</span>
            <span className="text-sm font-medium">{totalGames}</span>
          </div>

          {/* Games Won */}
          <div className="flex justify-between">
            <span className="text-sm text-default-500">Games Won</span>
            <span className="text-sm font-medium text-success">{gamesWon}</span>
          </div>

          <Divider />

          {/* Financial Stats */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-default-500">Total Wagered</span>
              <span className="text-sm font-medium">${totalWagered.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-default-500">Total Won</span>
              <span className="text-sm font-medium text-success">${totalWon.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-default-500">Net Profit</span>
              <span className={`text-sm font-medium ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                ${netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-default-500">Biggest Win</span>
              <span className="text-sm font-medium text-success">${biggestWin.toFixed(2)}</span>
            </div>
          </div>

          <Divider />

          {/* Performance Stats */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-default-500">Average Multiplier</span>
              <span className="text-sm font-medium">{averageMultiplier.toFixed(2)}x</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-default-500">Current Streak</span>
              <span className="text-sm font-medium">{currentWinStreak}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-default-500">Longest Streak</span>
              <span className="text-sm font-medium">{longestWinStreak}</span>
            </div>
          </div>

          <Divider />

          {/* Cascade Stats */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Cascade Statistics</h4>

            <div className="flex justify-between">
              <span className="text-xs text-default-500">Max Cascades</span>
              <span className="text-xs font-medium">{cascadeStats.maxCascades}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-xs text-default-500">Average Cascades</span>
              <span className="text-xs font-medium">{averageCascades.toFixed(1)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-xs text-default-500">Games w/ Cascades</span>
              <span className="text-xs font-medium">{cascadeStats.gamesWithCascades}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Recent Games Card */}
      {recentGames.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Recent Games</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {recentGames.map((game, index) => (
              <div key={game.gameId} className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Chip
                    color={game.status === 'win' ? 'success' : 'default'}
                    size="sm"
                    variant="flat"
                  >
                    {game.status === 'win' ? 'Win' : 'Loss'}
                  </Chip>
                  <span className="text-xs text-default-500">
                    ${game.betAmount.toFixed(2)}
                  </span>
                  {game.cascadeLevels > 0 && (
                    <Chip color="secondary" size="sm" variant="flat">
                      {game.cascadeLevels}x
                    </Chip>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {game.status === 'win' && (
                    <span className="text-xs text-default-500">
                      {game.multiplier.toFixed(2)}x
                    </span>
                  )}
                  <span className={`text-sm font-medium ${game.payout > 0 ? 'text-success' : 'text-default-500'
                    }`}>
                    {game.payout > 0 ? '+' : ''}${game.payout.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Current Game Info */}
      {currentGame && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Current Game</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-default-500">Bet Amount</p>
                <p className="font-medium">${currentGame.betAmount.toFixed(2)}</p>
              </div>

              <div>
                <p className="text-default-500">Current Win</p>
                <p className={`font-medium ${currentGame.totalPayout > 0 ? 'text-success' : ''}`}>
                  ${currentGame.totalPayout.toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-default-500">Cascades</p>
                <p className="font-medium">{currentGame.currentCascadeLevel}</p>
              </div>

              <div>
                <p className="text-default-500">Multiplier</p>
                <p className="font-medium">{currentGame.totalMultiplier.toFixed(2)}x</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Balance</h3>
        </CardHeader>
        <CardBody>
          <div className="text-center">
            <p className="text-2xl font-bold">${currentBalance.toFixed(2)}</p>
            <p className="text-sm text-default-500">Current Balance</p>
          </div>
        </CardBody>
      </Card>

      {/* No Games Message */}
      {totalGames === 0 && (
        <Card>
          <CardBody className="text-center py-8">
            <p className="text-default-500">No games played yet</p>
            <p className="text-sm text-default-400">Start playing to see your statistics!</p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}