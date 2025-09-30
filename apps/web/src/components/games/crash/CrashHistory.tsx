/**
 * Crash History Component
 * Shows previous rounds, statistics, and performance metrics
 */

'use client'

import React, { useMemo } from 'react'
import { Card, CardBody, CardHeader, Chip, Progress, Divider } from '@heroui/react'
import type { CrashResult, CrashGameState } from '@stake-games/shared'

interface CrashHistoryProps {
  gameHistory: CrashResult[]
  currentBalance: number
  currentGame: CrashGameState | null
}

export function CrashHistory({
  gameHistory,
  currentBalance,
  currentGame
}: CrashHistoryProps) {

  /**
   * Calculate statistics from game history
   */
  const statistics = useMemo(() => {
    if (gameHistory.length === 0) {
      return {
        totalRounds: 0,
        totalWagered: 0,
        totalWon: 0,
        netProfit: 0,
        winRate: 0,
        averageMultiplier: 0,
        biggestWin: 0,
        biggestLoss: 0,
        longestWinStreak: 0,
        longestLossStreak: 0,
        crashPointDistribution: {} as Record<string, number>
      }
    }

    const totalWagered = gameHistory.reduce((sum, game) => sum + game.betAmount, 0)
    const totalWon = gameHistory.reduce((sum, game) => sum + game.payout, 0)
    const wins = gameHistory.filter(game => game.status === 'win')
    const losses = gameHistory.filter(game => game.status === 'loss')
    
    // Calculate streaks
    let currentWinStreak = 0
    let currentLossStreak = 0
    let longestWinStreak = 0
    let longestLossStreak = 0
    
    gameHistory.forEach((game, index) => {
      if (game.status === 'win') {
        currentWinStreak++
        currentLossStreak = 0
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak)
      } else {
        currentLossStreak++
        currentWinStreak = 0
        longestLossStreak = Math.max(longestLossStreak, currentLossStreak)
      }
    })

    // Crash point distribution
    const crashPointDistribution: Record<string, number> = {}
    gameHistory.forEach(game => {
      if (game.crashPoint) {
        const range = getCrashPointRange(game.crashPoint)
        crashPointDistribution[range] = (crashPointDistribution[range] || 0) + 1
      }
    })

    return {
      totalRounds: gameHistory.length,
      totalWagered,
      totalWon,
      netProfit: totalWon - totalWagered,
      winRate: wins.length / gameHistory.length,
      averageMultiplier: wins.length > 0 ? wins.reduce((sum, game) => sum + game.multiplier, 0) / wins.length : 0,
      biggestWin: Math.max(...gameHistory.map(g => g.payout), 0),
      biggestLoss: Math.max(...losses.map(g => g.betAmount), 0),
      longestWinStreak,
      longestLossStreak,
      crashPointDistribution
    }
  }, [gameHistory])

  /**
   * Get crash point range for distribution
   */
  const getCrashPointRange = (crashPoint: number): string => {
    if (crashPoint < 1.5) return '1.00-1.49x'
    if (crashPoint < 2.0) return '1.50-1.99x'
    if (crashPoint < 5.0) return '2.00-4.99x'
    if (crashPoint < 10.0) return '5.00-9.99x'
    if (crashPoint < 50.0) return '10.00-49.99x'
    return '50.00x+'
  }

  /**
   * Get color for multiplier based on value
   */
  const getMultiplierColor = (multiplier: number): string => {
    if (multiplier >= 10) return 'text-purple-400'
    if (multiplier >= 5) return 'text-yellow-400'
    if (multiplier >= 2) return 'text-green-400'
    return 'text-red-400'
  }

  /**
   * Format currency
   */
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`
  }

  /**
   * Format percentage
   */
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`
  }

  return (
    <div className="space-y-4">
      {/* Current Game Info */}
      {currentGame && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Current Game</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-default-600">Round:</span>
              <span className="font-semibold">#{currentGame.roundNumber}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-default-600">Bet Amount:</span>
              <span className="font-semibold">{formatCurrency(currentGame.betAmount || 0)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-default-600">Current Multiplier:</span>
              <span className={`font-semibold ${getMultiplierColor(currentGame.currentMultiplier)}`}>
                {currentGame.currentMultiplier.toFixed(2)}x
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-default-600">Potential Payout:</span>
              <span className="font-semibold text-success">
                {formatCurrency(currentGame.potentialPayout || 0)}
              </span>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Statistics */}
      {gameHistory.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Statistics</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* Basic Stats */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-default-600">Total Rounds:</span>
                  <span className="font-semibold">{statistics.totalRounds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-600">Win Rate:</span>
                  <span className="font-semibold text-success">
                    {formatPercentage(statistics.winRate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-600">Avg Multiplier:</span>
                  <span className="font-semibold">
                    {statistics.averageMultiplier.toFixed(2)}x
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-default-600">Total Wagered:</span>
                  <span className="font-semibold">{formatCurrency(statistics.totalWagered)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-600">Total Won:</span>
                  <span className="font-semibold text-success">
                    {formatCurrency(statistics.totalWon)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-default-600">Net Profit:</span>
                  <span className={`font-semibold ${
                    statistics.netProfit >= 0 ? 'text-success' : 'text-danger'
                  }`}>
                    {statistics.netProfit >= 0 ? '+' : ''}{formatCurrency(statistics.netProfit)}
                  </span>
                </div>
              </div>
            </div>

            <Divider />

            {/* Performance Metrics */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-default-600">Biggest Win:</span>
                <span className="font-semibold text-success">
                  {formatCurrency(statistics.biggestWin)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-default-600">Biggest Loss:</span>
                <span className="font-semibold text-danger">
                  {formatCurrency(statistics.biggestLoss)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-default-600">Longest Win Streak:</span>
                <span className="font-semibold text-success">
                  {statistics.longestWinStreak} games
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-default-600">Longest Loss Streak:</span>
                <span className="font-semibold text-danger">
                  {statistics.longestLossStreak} games
                </span>
              </div>
            </div>

            <Divider />

            {/* Win Rate Progress */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-default-600">Win Rate Progress:</span>
                <span className="font-semibold">{formatPercentage(statistics.winRate)}</span>
              </div>
              <Progress
                value={statistics.winRate * 100}
                maxValue={100}
                color="success"
                size="sm"
                className="w-full"
              />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Recent Games */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">
            Recent Games {gameHistory.length > 0 && `(${Math.min(10, gameHistory.length)})`}
          </h3>
        </CardHeader>
        <CardBody className="space-y-2">
          {gameHistory.length === 0 ? (
            <div className="text-center text-default-500 py-8">
              <p>No games played yet</p>
              <p className="text-sm mt-1">Start playing to see your game history</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {gameHistory.slice(-10).reverse().map((game) => (
                <div
                  key={game.gameId}
                  className="flex items-center justify-between p-3 rounded-lg border border-default-200 hover:bg-default-50"
                >
                  <div className="flex items-center gap-3">
                    <Chip
                      color={game.status === 'win' ? 'success' : 'danger'}
                      size="sm"
                      variant="flat"
                    >
                      {game.status === 'win' ? 'Win' : 'Loss'}
                    </Chip>
                    <div className="text-sm">
                      <div className="font-semibold">
                        Bet: {formatCurrency(game.betAmount)}
                      </div>
                      <div className="text-default-600 text-xs">
                        Crash @ {game.crashPoint?.toFixed(2)}x
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {game.status === 'win' ? (
                      <>
                        <div className="font-semibold text-success">
                          +{formatCurrency(game.payout)}
                        </div>
                        <div className={`text-xs ${getMultiplierColor(game.multiplier)}`}>
                          @ {game.multiplier.toFixed(2)}x
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold text-danger">
                          -{formatCurrency(game.betAmount)}
                        </div>
                        <div className="text-xs text-default-500">
                          Crashed
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Crash Point Distribution */}
      {gameHistory.length > 0 && Object.keys(statistics.crashPointDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Crash Point Distribution</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {Object.entries(statistics.crashPointDistribution)
              .sort(([a], [b]) => {
                const aNum = parseFloat(a.split('-')[0]!)
                const bNum = parseFloat(b.split('-')[0]!)
                return aNum - bNum
              })
              .map(([range, count]) => {
                const percentage = (count / statistics.totalRounds) * 100
                return (
                  <div key={range} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{range}</span>
                      <span className="text-default-600">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      maxValue={100}
                      color="primary"
                      size="sm"
                      className="w-full"
                    />
                  </div>
                )
              })}
          </CardBody>
        </Card>
      )}

      {/* Balance Info */}
      <Card className="border-default-200">
        <CardBody className="py-3">
          <div className="flex justify-between items-center">
            <span className="text-default-600 text-sm">Current Balance:</span>
            <span className="font-semibold text-lg text-success">
              {formatCurrency(currentBalance)}
            </span>
          </div>
          {statistics.netProfit !== 0 && (
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-default-600">Session P&L:</span>
              <span className={`font-semibold ${
                statistics.netProfit >= 0 ? 'text-success' : 'text-danger'
              }`}>
                {statistics.netProfit >= 0 ? '+' : ''}{formatCurrency(statistics.netProfit)}
              </span>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}