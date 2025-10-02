/**
 * Dragon Tower Controls Component
 * Handles difficulty selection, betting controls, and game actions
 */

'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Select,
  SelectItem,
  Input,
  Slider,
  Switch,
  Divider,
  Chip,
  Progress
} from '@heroui/react'
import type {
  DragonTowerConfig,
  DragonTowerGameState,
  DragonTowerDifficulty
} from '@yois-games/shared'

/**
 * Props for DragonTowerControls component
 */
interface DragonTowerControlsProps {
  config: DragonTowerConfig
  onConfigChange: (config: Partial<DragonTowerConfig>) => void
  betAmount: number
  onBetChange: (amount: number) => void
  balance: number
  minBet: number
  maxBet: number
  gameState: DragonTowerGameState | null
  gameStatus: 'idle' | 'playing' | 'finished' | 'loading'
  onStartGame: () => void
  onCashOut: () => void
  onNewGame: () => void
}

/**
 * Difficulty information for UI display
 */
const DIFFICULTY_INFO = {
  easy: {
    color: 'success',
    description: '2 tiles per level',
    winChance: '50%',
    maxMultiplier: '38.44x'
  },
  medium: {
    color: 'warning',
    description: '3 tiles per level',
    winChance: '33.33%',
    maxMultiplier: '13,122x'
  },
  hard: {
    color: 'danger',
    description: '4 tiles per level',
    winChance: '25%',
    maxMultiplier: '2,730x'
  },
  expert: {
    color: 'secondary',
    description: '5 tiles per level',
    winChance: '20%',
    maxMultiplier: '10,416x'
  }
} as const

/**
 * Bet amount presets for quick selection
 */
const BET_PRESETS = [0.1, 1, 5, 10, 50, 100]

/**
 * Dragon Tower Controls Component
 */
export function DragonTowerControls({
  config,
  onConfigChange,
  betAmount,
  onBetChange,
  balance,
  minBet,
  maxBet,
  gameState,
  gameStatus,
  onStartGame,
  onCashOut,
  onNewGame
}: DragonTowerControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Calculate potential payout and next level info
  const nextLevelInfo = useMemo(() => {
    if (!gameState || gameState.gameStatus !== 'climbing') return null

    const currentLevel = gameState.currentLevel
    const nextLevel = gameState.levels.find(l => l.id === currentLevel + 1)
    if (!nextLevel) return null

    const difficultyInfo = DIFFICULTY_INFO[gameState.difficulty]
    const nextMultiplier = nextLevel.multiplier
    const nextPayout = gameState.betAmount * nextMultiplier

    return {
      level: nextLevel.id,
      multiplier: nextMultiplier,
      payout: nextPayout,
      winChance: difficultyInfo.winChance
    }
  }, [gameState])

  /**
   * Handle difficulty change
   */
  const handleDifficultyChange = useCallback((difficulty: DragonTowerDifficulty) => {
    onConfigChange({ difficulty })
  }, [onConfigChange])

  /**
   * Handle bet amount change from input
   */
  const handleBetInputChange = useCallback((value: string) => {
    const amount = parseFloat(value)
    if (!isNaN(amount) && amount >= minBet && amount <= maxBet) {
      onBetChange(amount)
    }
  }, [minBet, maxBet, onBetChange])

  /**
   * Handle bet preset selection
   */
  const handlePresetBet = useCallback((preset: number) => {
    const clampedAmount = Math.min(Math.max(preset, minBet), Math.min(maxBet, balance))
    onBetChange(clampedAmount)
  }, [minBet, maxBet, balance, onBetChange])

  /**
   * Handle auto-cashout toggle
   */
  const handleAutoCashoutToggle = useCallback((enabled: boolean) => {
    onConfigChange({
      autoCashout: enabled ? { enabled: true, multiplier: 2 } : { enabled: false, multiplier: 2 }
    })
  }, [onConfigChange])

  /**
   * Handle auto-cashout multiplier change
   */
  const handleAutoCashoutMultiplier = useCallback((multiplier: number) => {
    if (config.autoCashout) {
      onConfigChange({
        autoCashout: { ...config.autoCashout, multiplier }
      })
    }
  }, [config.autoCashout, onConfigChange])

  /**
   * Calculate max bet based on balance
   */
  const effectiveMaxBet = useMemo(() => {
    return Math.min(maxBet, balance)
  }, [maxBet, balance])

  const isGameActive = gameStatus === 'playing' && gameState
  const canCashOut = isGameActive && gameState?.canCashOut
  const isLoading = gameStatus === 'loading'

  return (
    <div className="space-y-4">
      {/* Game Configuration */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Game Settings</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Difficulty Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Difficulty</label>
            <Select
              selectedKeys={[config.difficulty]}
              onSelectionChange={(keys) => {
                const difficulty = Array.from(keys)[0] as DragonTowerDifficulty
                handleDifficultyChange(difficulty)
              }}
              isDisabled={isGameActive}
            >
              {Object.entries(DIFFICULTY_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <div className="font-medium capitalize">{key}</div>
                      <div className="text-xs text-default-500">{info.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">{info.winChance}</div>
                      <div className="text-xs text-default-500">Win Rate</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </Select>

            {/* Difficulty Info Display */}
            <div className="mt-2 p-3 bg-default-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-default-600">Win Chance:</span>
                  <span className="ml-2 font-semibold">{DIFFICULTY_INFO[config.difficulty].winChance}</span>
                </div>
                <div>
                  <span className="text-default-600">Max Multiplier:</span>
                  <span className="ml-2 font-semibold">{DIFFICULTY_INFO[config.difficulty].maxMultiplier}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bet Amount */}
          <div>
            <label className="text-sm font-medium mb-2 block">Bet Amount</label>
            <Input
              type="number"
              value={betAmount.toString()}
              onChange={(e) => handleBetInputChange(e.target.value)}
              min={minBet}
              max={effectiveMaxBet}
              step="0.01"
              isDisabled={isGameActive}
              startContent={<span className="text-default-400">$</span>}
              endContent={
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => handlePresetBet(effectiveMaxBet)}
                  isDisabled={isGameActive}
                >
                  Max
                </Button>
              }
            />

            {/* Bet Presets */}
            <div className="flex flex-wrap gap-2 mt-2">
              {BET_PRESETS.filter(preset => preset <= effectiveMaxBet).map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  variant="flat"
                  onPress={() => handlePresetBet(preset)}
                  isDisabled={isGameActive}
                  className={betAmount === preset ? 'bg-primary text-primary-foreground' : ''}
                >
                  ${preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Balance Info */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-default-600">Balance:</span>
            <span className="font-semibold">${balance.toFixed(2)}</span>
          </div>
        </CardBody>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Advanced</h3>
            <Switch
              size="sm"
              isSelected={showAdvanced}
              onValueChange={setShowAdvanced}
            >
              Show Advanced
            </Switch>
          </div>
        </CardHeader>
        {showAdvanced && (
          <CardBody className="space-y-4">
            {/* Auto Cashout */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Auto Cash Out</label>
                <Switch
                  size="sm"
                  isSelected={config.autoCashout?.enabled || false}
                  onValueChange={handleAutoCashoutToggle}
                  isDisabled={isGameActive}
                />
              </div>
              {config.autoCashout?.enabled && (
                <div className="space-y-2">
                  <Input
                    type="number"
                    label="Multiplier"
                    value={config.autoCashout.multiplier.toString()}
                    onChange={(e) => handleAutoCashoutMultiplier(parseFloat(e.target.value) || 2)}
                    min="1.01"
                    max="100"
                    step="0.01"
                    isDisabled={isGameActive}
                    endContent="x"
                  />
                  <p className="text-xs text-default-500">
                    Automatically cash out when this multiplier is reached
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        )}
      </Card>

      {/* Game Actions */}
      <Card>
        <CardBody className="space-y-3">
          {!isGameActive ? (
            <Button
              color="primary"
              size="lg"
              onPress={onStartGame}
              isDisabled={isLoading || betAmount > balance || betAmount < minBet}
              isLoading={isLoading}
              className="w-full"
            >
              {isLoading ? 'Starting...' : `Start Climb - $${betAmount}`}
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Current Game Info */}
              {gameState && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Current Level</span>
                    <span className="font-bold text-lg">{gameState.currentLevel}/9</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Current Multiplier</span>
                    <span className="font-bold text-lg text-success">
                      {gameState.currentMultiplier.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Potential Payout</span>
                    <span className="font-bold text-lg text-success">
                      ${gameState.potentialPayout.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Next Level Preview */}
              {nextLevelInfo && (
                <div className="p-3 bg-warning/10 rounded-lg">
                  <div className="text-sm font-medium mb-2">Next Level Preview</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">Level {nextLevelInfo.level} ({nextLevelInfo.winChance} chance)</span>
                    <span className="font-semibold text-warning">
                      {nextLevelInfo.multiplier.toFixed(2)}x (${nextLevelInfo.payout.toFixed(2)})
                    </span>
                  </div>
                </div>
              )}

              {/* Cash Out Button */}
              <Button
                color="success"
                size="lg"
                onPress={onCashOut}
                isDisabled={!canCashOut || isLoading}
                className="w-full"
              >
                {gameState ? `Cash Out - $${gameState.potentialPayout.toFixed(2)}` : 'Cash Out'}
              </Button>

              {/* New Game Button */}
              <Button
                color="default"
                variant="bordered"
                size="lg"
                onPress={onNewGame}
                className="w-full"
              >
                New Game
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Game Progress */}
      {gameState && isGameActive && (
        <Card>
          <CardBody>
            <div className="mb-2">
              <div className="flex justify-between text-sm">
                <span>Tower Progress</span>
                <span>{gameState.completedLevels}/9 levels</span>
              </div>
            </div>
            <Progress
              value={(gameState.completedLevels / 9) * 100}
              color="success"
              className="w-full"
            />
          </CardBody>
        </Card>
      )}
    </div>
  )
}