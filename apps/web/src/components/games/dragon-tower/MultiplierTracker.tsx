/**
 * Dragon Tower Multiplier Tracker Component
 * Displays current and potential multipliers with level progression
 */

'use client'

import React, { useMemo } from 'react'
import { Card, CardBody, CardHeader, Chip, Progress } from '@heroui/react'
import { motion } from 'framer-motion'
import type {
  DragonTowerGameState,
  DragonTowerDifficulty
} from '@yois-games/shared'

/**
 * Props for MultiplierTracker component
 */
interface MultiplierTrackerProps {
  gameState: DragonTowerGameState | null
  betAmount: number
}

/**
 * Difficulty multiplier information
 */
const DIFFICULTY_MULTIPLIERS = {
  easy: {
    name: 'Easy',
    color: 'success',
    baseMultiplier: 1.5,
    maxLevel: 9
  },
  medium: {
    name: 'Medium',
    color: 'warning',
    baseMultiplier: 2,
    maxLevel: 9
  },
  hard: {
    name: 'Hard',
    color: 'danger',
    baseMultiplier: 2.67,
    maxLevel: 9
  },
  expert: {
    name: 'Expert',
    color: 'secondary',
    baseMultiplier: 3.33,
    maxLevel: 9
  }
} as const

/**
 * Calculate multiplier for a given level and difficulty
 */
const calculateLevelMultiplier = (level: number, difficulty: DragonTowerDifficulty): number => {
  const baseMultiplier = DIFFICULTY_MULTIPLIERS[difficulty].baseMultiplier
  if (level <= 0) return 1

  // Progressive multiplier system: baseMultiplier^level * 0.97 (house edge)
  const multiplier = Math.pow(baseMultiplier, level) * 0.97
  return Math.round(multiplier * 10000) / 10000
}

/**
 * Generate multiplier progression for all levels
 */
const getMultiplierProgression = (difficulty: DragonTowerDifficulty) => {
  const progression = []
  for (let level = 1; level <= 9; level++) {
    progression.push({
      level,
      multiplier: calculateLevelMultiplier(level, difficulty),
      payout: 0 // Will be calculated with actual bet amount
    })
  }
  return progression
}

/**
 * Level row component for multiplier display
 */
const LevelRow = React.memo(({
  level,
  multiplier,
  payout,
  isActive,
  isCompleted,
  isCurrent
}: {
  level: number
  multiplier: number
  payout: number
  isActive: boolean
  isCompleted: boolean
  isCurrent: boolean
}) => {
  const getRowStyle = () => {
    if (isCompleted) return 'bg-success/10 border-success/20'
    if (isCurrent) return 'bg-primary/10 border-primary/20 animate-pulse'
    if (isActive) return 'bg-default/5 border-default/10'
    return 'bg-default/5 border-default/10 opacity-60'
  }

  const getTextStyle = () => {
    if (isCompleted) return 'text-success'
    if (isCurrent) return 'text-primary font-bold'
    return 'text-default-600'
  }

  return (
    <motion.div
      className={`flex items-center justify-between p-2 rounded-lg border ${getRowStyle()}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: level * 0.05 }}
    >
      <div className="flex items-center gap-3">
        <Chip
          size="sm"
          variant="flat"
          color={isCompleted ? 'success' : isCurrent ? 'primary' : 'default'}
        >
          {level}
        </Chip>
        {isCompleted && <span className="text-success text-sm">✓</span>}
        {isCurrent && <span className="text-primary text-sm animate-bounce">◄</span>}
      </div>

      <div className="flex items-center gap-4">
        <div className={`text-right ${getTextStyle()}`}>
          <div className="font-semibold">
            {multiplier.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}x
          </div>
          <div className="text-xs opacity-75">
            ${payout.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
})

LevelRow.displayName = 'LevelRow'

/**
 * Main multiplier tracker component
 */
export function MultiplierTracker({ gameState, betAmount }: MultiplierTrackerProps) {
  // Generate multiplier progression based on current settings
  const progression = useMemo(() => {
    if (!gameState) return []

    return getMultiplierProgression(gameState.difficulty).map(item => ({
      ...item,
      payout: betAmount * item.multiplier
    }))
  }, [gameState?.difficulty, betAmount])

  // Current game status
  const currentLevel = gameState?.currentLevel || 1
  const completedLevels = gameState?.completedLevels || 0
  const currentMultiplier = gameState?.currentMultiplier || 1
  const potentialPayout = gameState?.potentialPayout || betAmount

  if (!gameState) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Multiplier Progression</h3>
        </CardHeader>
        <CardBody>
          <div className="text-center text-default-500 py-8">
            <p>Start a game to see multiplier progression</p>
          </div>
        </CardBody>
      </Card>
    )
  }

  const difficultyInfo = DIFFICULTY_MULTIPLIERS[gameState.difficulty]

  return (
    <div className="space-y-4">
      {/* Current Status Card */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <CardBody className="p-4">
          <div className="text-center">
            <div className="mb-2">
              <Chip
                color={difficultyInfo.color as any}
                variant="flat"
                size="sm"
              >
                {difficultyInfo.name} Mode
              </Chip>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {currentMultiplier.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}x
                </div>
                <div className="text-sm text-default-600">Current Multiplier</div>
              </div>

              <div>
                <div className="text-2xl font-bold text-success">
                  ${potentialPayout.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                <div className="text-sm text-default-600">Potential Payout</div>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-sm text-default-600 mb-1">
                <span>Progress</span>
                <span>{completedLevels}/9 levels</span>
              </div>
              <Progress
                value={(completedLevels / 9) * 100}
                color="primary"
                size="sm"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Multiplier Progression Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <h3 className="text-lg font-semibold">Level Multipliers</h3>
            <div className="text-right text-sm text-default-600">
              <div>Bet: ${betAmount}</div>
            </div>
          </div>
        </CardHeader>
        <CardBody className="max-h-80 overflow-y-auto">
          <div className="space-y-2">
            {progression.map((item, index) => {
              const isCompleted = item.level <= completedLevels
              const isCurrent = item.level === currentLevel
              const isActive = item.level <= currentLevel + 1

              return (
                <LevelRow
                  key={item.level}
                  level={item.level}
                  multiplier={item.multiplier}
                  payout={item.payout}
                  isActive={isActive}
                  isCompleted={isCompleted}
                  isCurrent={isCurrent}
                />
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* Risk vs Reward Info */}
      {gameState.gameStatus === 'climbing' && currentLevel <= 9 && (
        <Card className="border-warning bg-warning/5">
          <CardBody className="p-4">
            <div className="text-center">
              <div className="text-sm font-medium text-warning mb-2">
                Next Level Risk Assessment
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-semibold">
                    {Math.round((1 / (gameState.levels[0]?.tiles?.length || 2)) * 100)}%
                  </div>
                  <div className="text-default-600">Success Rate</div>
                </div>

                <div>
                  <div className="font-semibold">
                    {Math.round((1 - (1 / (gameState.levels[0]?.tiles?.length || 2))) * 100)}%
                  </div>
                  <div className="text-default-600">Risk</div>
                </div>
              </div>

              {currentLevel < 9 && (
                <div className="mt-3 pt-3 border-t border-warning/20">
                  <div className="text-xs text-default-600">
                    Next level multiplier:{' '}
                    <span className="font-semibold">
                      {progression[currentLevel]?.multiplier.toFixed(2)}x
                    </span>
                    {' '}(${(progression[currentLevel]?.payout || 0).toFixed(2)})
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}