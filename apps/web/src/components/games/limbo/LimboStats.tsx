/**
 * Limbo Statistics Component
 * Displays game history, performance metrics, and statistical analysis
 */

'use client'

import React, { useMemo } from 'react'
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Chip,
  Progress,
  Divider,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell
} from '@heroui/react'
import type { LimboStats } from '@stake-games/shared'

/**
 * Game history entry interface for statistics
 */
interface GameHistoryEntry {
  id: string
  timestamp: Date
  betAmount: number
  targetMultiplier: number
  generatedMultiplier: number
  isWin: boolean
  payout: number
  profit: number
}

/**
 * Props for LimboStats component
 */
interface LimboStatsProps {
  gameHistory: GameHistoryEntry[]
  currentBalance: number
  initialBalance: number
}

/**
 * Multiplier range for categorization
 */
interface MultiplierRange {
  label: string
  min: number
  max: number
  attempts: number
  wins: number
  winRate: number
}

/**
 * LimboStats component for game statistics and history
 */
export function LimboStats({
  gameHistory,
  currentBalance,
  initialBalance
}: LimboStatsProps) {

  /**
   * Calculate comprehensive statistics from game history
   */
  const statistics = useMemo((): LimboStats => {
    if (gameHistory.length === 0) {
      return {
        totalRounds: 0,
        roundsWon: 0,
        roundsLost: 0,
        winRate: 0,
        totalWagered: 0,
        totalWon: 0,
        netProfit: 0,
        biggestWin: 0,
        biggestLoss: 0,
        longestWinStreak: 0,
        currentWinStreak: 0,
        longestLossStreak: 0,
        currentLossStreak: 0,
        highestGeneratedMultiplier: 0,
        mostCommonTarget: 0,
        averageTarget: 0,
        averageGenerated: 0,
        successRatesByTarget: {},
        autoBettingSessions: 0,
        totalAutoBets: 0,
        autoBettingProfit: 0,
        bestAutoBettingSession: 0,
        worstAutoBettingSession: 0
      }
    }

    const totalRounds = gameHistory.length
    const roundsWon = gameHistory.filter(game => game.isWin).length
    const roundsLost = totalRounds - roundsWon
    const winRate = (roundsWon / totalRounds) * 100

    const totalWagered = gameHistory.reduce((sum, game) => sum + game.betAmount, 0)
    const totalWon = gameHistory.reduce((sum, game) => sum + game.payout, 0)
    const netProfit = currentBalance - initialBalance

    const profits = gameHistory.map(game => game.profit)
    const biggestWin = Math.max(...profits.filter(p => p > 0), 0)
    const biggestLoss = Math.abs(Math.min(...profits.filter(p => p < 0), 0))

    // Calculate streaks
    let longestWinStreak = 0
    let longestLossStreak = 0
    let currentWinStreak = 0
    let currentLossStreak = 0
    let tempWinStreak = 0
    let tempLossStreak = 0

    gameHistory.forEach((game, index) => {
      if (game.isWin) {
        tempWinStreak++
        tempLossStreak = 0
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak)
      } else {
        tempLossStreak++
        tempWinStreak = 0
        longestLossStreak = Math.max(longestLossStreak, tempLossStreak)
      }

      // Current streak (from most recent games)
      if (index === 0) {
        currentWinStreak = game.isWin ? 1 : 0
        currentLossStreak = game.isWin ? 0 : 1
      }
    })

    // Multiplier statistics
    const generatedMultipliers = gameHistory.map(game => game.generatedMultiplier)
    const targetMultipliers = gameHistory.map(game => game.targetMultiplier)
    
    const highestGeneratedMultiplier = Math.max(...generatedMultipliers)
    const averageGenerated = generatedMultipliers.reduce((sum, m) => sum + m, 0) / generatedMultipliers.length
    const averageTarget = targetMultipliers.reduce((sum, m) => sum + m, 0) / targetMultipliers.length

    // Find most common target
    const targetCounts = targetMultipliers.reduce((counts, target) => {
      counts[target] = (counts[target] || 0) + 1
      return counts
    }, {} as Record<number, number>)
    
    const mostCommonTarget = parseFloat(Object.entries(targetCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '0')

    // Success rates by target ranges
    const ranges = [
      { label: '1.01-2.00x', min: 1.01, max: 2.00 },
      { label: '2.01-5.00x', min: 2.01, max: 5.00 },
      { label: '5.01-10.00x', min: 5.01, max: 10.00 },
      { label: '10.01-50.00x', min: 10.01, max: 50.00 },
      { label: '50.01+x', min: 50.01, max: Infinity }
    ]

    const successRatesByTarget = ranges.reduce((rates, range) => {
      const gamesInRange = gameHistory.filter(game => 
        game.targetMultiplier >= range.min && game.targetMultiplier <= range.max
      )
      
      if (gamesInRange.length > 0) {
        const wins = gamesInRange.filter(game => game.isWin).length
        rates[range.label] = {
          attempts: gamesInRange.length,
          wins,
          winRate: (wins / gamesInRange.length) * 100
        }
      }
      
      return rates
    }, {} as Record<string, { attempts: number; wins: number; winRate: number }>)

    return {
      totalRounds,
      roundsWon,
      roundsLost,
      winRate,
      totalWagered,
      totalWon,
      netProfit,
      biggestWin,
      biggestLoss,
      longestWinStreak,
      currentWinStreak,
      longestLossStreak,
      currentLossStreak,
      highestGeneratedMultiplier,
      mostCommonTarget,
      averageTarget,
      averageGenerated,
      successRatesByTarget,
      autoBettingSessions: 0, // Would be calculated from auto-bet session data
      totalAutoBets: 0,
      autoBettingProfit: 0,
      bestAutoBettingSession: 0,
      worstAutoBettingSession: 0
    }
  }, [gameHistory, currentBalance, initialBalance])

  /**
   * Get recent game history (last 10 games)
   */
  const recentGames = useMemo(() => {
    return gameHistory.slice(0, 10)
  }, [gameHistory])

  /**
   * Calculate multiplier distribution
   */
  const multiplierDistribution = useMemo(() => {
    const ranges = [
      { label: '1.00-1.99x', min: 1.00, max: 1.99, count: 0 },
      { label: '2.00-4.99x', min: 2.00, max: 4.99, count: 0 },
      { label: '5.00-9.99x', min: 5.00, max: 9.99, count: 0 },
      { label: '10.00-49.99x', min: 10.00, max: 49.99, count: 0 },
      { label: '50.00+x', min: 50.00, max: Infinity, count: 0 }
    ]

    gameHistory.forEach(game => {
      const multiplier = game.generatedMultiplier
      ranges.forEach(range => {
        if (multiplier >= range.min && multiplier < range.max) {
          range.count++
        }
      })
    })

    return ranges
  }, [gameHistory])

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
    return `${value.toFixed(1)}%`
  }

  /**
   * Format multiplier
   */
  const formatMultiplier = (value: number): string => {
    return `${value.toFixed(2)}x`
  }

  return (
    <div className="space-y-4">
      {/* Overall Statistics */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Session Statistics</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{statistics.totalRounds}</div>
              <div className="text-sm text-default-500">Total Rounds</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                statistics.winRate >= 50 ? 'text-success' : 'text-default-600'
              }`}>
                {formatPercentage(statistics.winRate)}
              </div>
              <div className="text-sm text-default-500">Win Rate</div>
            </div>
          </div>

          <Divider />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-default-500">Rounds Won:</span>
              <span className="font-semibold text-success">{statistics.roundsWon}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-500">Rounds Lost:</span>
              <span className="font-semibold text-danger">{statistics.roundsLost}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-500">Total Wagered:</span>
              <span className="font-semibold">{formatCurrency(statistics.totalWagered)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-500">Total Won:</span>
              <span className="font-semibold">{formatCurrency(statistics.totalWon)}</span>
            </div>
          </div>

          <Divider />

          <div className="text-center">
            <div className={`text-xl font-bold ${
              statistics.netProfit >= 0 ? 'text-success' : 'text-danger'
            }`}>
              {statistics.netProfit >= 0 ? '+' : ''}{formatCurrency(statistics.netProfit)}
            </div>
            <div className="text-sm text-default-500">Net Profit</div>
          </div>
        </CardBody>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Performance</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-default-500">Biggest Win:</span>
              <span className="font-semibold text-success">
                {formatCurrency(statistics.biggestWin)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-500">Biggest Loss:</span>
              <span className="font-semibold text-danger">
                {formatCurrency(statistics.biggestLoss)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-500">Longest Win Streak:</span>
              <span className="font-semibold">{statistics.longestWinStreak}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-500">Longest Loss Streak:</span>
              <span className="font-semibold">{statistics.longestLossStreak}</span>
            </div>
          </div>

          <Divider />

          <div className="text-center">
            <div className="text-lg font-semibold">
              {formatMultiplier(statistics.highestGeneratedMultiplier)}
            </div>
            <div className="text-sm text-default-500">Highest Multiplier Hit</div>
          </div>
        </CardBody>
      </Card>

      {/* Multiplier Analysis */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Multiplier Analysis</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-default-500">Most Common Target:</span>
              <span className="font-semibold">{formatMultiplier(statistics.mostCommonTarget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-default-500">Average Target:</span>
              <span className="font-semibold">{formatMultiplier(statistics.averageTarget)}</span>
            </div>
          </div>

          <Divider />

          <div>
            <div className="text-sm font-medium mb-3">Generated Multiplier Distribution</div>
            <div className="space-y-2">
              {multiplierDistribution.map((range) => (
                <div key={range.label} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{range.label}</span>
                      <span>{range.count}</span>
                    </div>
                    <Progress
                      value={statistics.totalRounds > 0 ? (range.count / statistics.totalRounds) * 100 : 0}
                      size="sm"
                      color="primary"
                      className="max-w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Success Rates by Target Range */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Success Rates by Target Range</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {Object.entries(statistics.successRatesByTarget).map(([range, data]) => (
              <div key={range} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium min-w-20">{range}</span>
                  <Progress
                    value={data.winRate}
                    size="sm"
                    color={data.winRate >= 50 ? "success" : data.winRate >= 25 ? "warning" : "danger"}
                    className="flex-1 max-w-32"
                  />
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold">{formatPercentage(data.winRate)}</div>
                  <div className="text-xs text-default-500">
                    {data.wins}/{data.attempts}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Recent Game History */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Recent Games</h3>
        </CardHeader>
        <CardBody>
          {recentGames.length === 0 ? (
            <div className="text-center text-default-500 py-8">
              No games played yet
            </div>
          ) : (
            <Table 
              aria-label="Recent game history"
              classNames={{
                wrapper: "max-h-96 overflow-y-auto"
              }}
            >
              <TableHeader>
                <TableColumn>TARGET</TableColumn>
                <TableColumn>GENERATED</TableColumn>
                <TableColumn>RESULT</TableColumn>
                <TableColumn>PROFIT</TableColumn>
              </TableHeader>
              <TableBody>
                {recentGames.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>
                      <span className="font-medium">
                        {formatMultiplier(game.targetMultiplier)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        game.isWin ? 'text-success' : 'text-default-600'
                      }`}>
                        {formatMultiplier(game.generatedMultiplier)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Chip
                        color={game.isWin ? "success" : "danger"}
                        variant="flat"
                        size="sm"
                      >
                        {game.isWin ? 'Win' : 'Loss'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${
                        game.profit >= 0 ? 'text-success' : 'text-danger'
                      }`}>
                        {game.profit >= 0 ? '+' : ''}{formatCurrency(game.profit)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  )
}