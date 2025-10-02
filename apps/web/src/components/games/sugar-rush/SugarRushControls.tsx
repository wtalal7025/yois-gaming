/**
 * Sugar Rush Game Controls Component
 * Handles betting controls, game configuration, and action buttons
 */

'use client'

import React from 'react'
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Slider,
  Switch,
  Divider,
  Chip
} from '@heroui/react'
import type {
  SugarRushGameState,
  SugarRushConfig
} from '@yois-games/shared'

/**
 * Game status type for controls
 */
type GameStatus = 'idle' | 'spinning' | 'evaluating' | 'cascading' | 'complete' | 'loading'

/**
 * Props for SugarRushControls component
 */
interface SugarRushControlsProps {
  config: SugarRushConfig
  onConfigChange: (config: Partial<SugarRushConfig>) => void
  betAmount: number
  onBetChange: (amount: number) => void
  balance: number
  minBet: number
  maxBet: number
  gameState: SugarRushGameState | null
  gameStatus: GameStatus
  onStartGame: () => void
  onNewGame: () => void
}

/**
 * Bet preset amounts
 */
const BET_PRESETS = [0.1, 0.5, 1, 5, 10, 25, 50, 100]

/**
 * Sugar Rush controls component
 */
export function SugarRushControls({
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
  onNewGame
}: SugarRushControlsProps) {

  const isGameActive = gameStatus !== 'idle' && gameStatus !== 'complete'
  const canPlaceBet = !isGameActive && balance >= betAmount && betAmount >= minBet && betAmount <= maxBet

  /**
   * Handle bet preset selection
   */
  const handlePresetBet = (preset: number) => {
    if (!isGameActive && preset <= balance) {
      onBetChange(preset)
    }
  }

  /**
   * Handle max bet
   */
  const handleMaxBet = () => {
    const maxAffordable = Math.min(balance, maxBet)
    onBetChange(maxAffordable)
  }

  /**
   * Handle half bet
   */
  const handleHalfBet = () => {
    const halfAmount = Math.max(betAmount / 2, minBet)
    onBetChange(halfAmount)
  }

  /**
   * Handle double bet
   */
  const handleDoubleBet = () => {
    const doubleAmount = Math.min(betAmount * 2, balance, maxBet)
    onBetChange(doubleAmount)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <h3 className="text-lg font-semibold">Game Controls</h3>
      </CardHeader>

      <CardBody className="space-y-6">
        {/* Balance Display */}
        <div className="text-center">
          <p className="text-sm text-default-500">Balance</p>
          <p className="text-2xl font-bold">${balance.toFixed(2)}</p>
        </div>

        <Divider />

        {/* Bet Amount Controls */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Bet Amount</span>
            <span className="text-lg font-bold">${betAmount.toFixed(2)}</span>
          </div>

          <Slider
            size="sm"
            step={0.01}
            minValue={minBet}
            maxValue={Math.min(balance, maxBet)}
            value={betAmount}
            onChange={(value) => onBetChange(Array.isArray(value) ? value[0] : value)}
            isDisabled={isGameActive}
            className="w-full"
          />

          {/* Bet Presets */}
          <div className="grid grid-cols-4 gap-2">
            {BET_PRESETS.filter(preset => preset <= balance).map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant={betAmount === preset ? "solid" : "bordered"}
                color={betAmount === preset ? "primary" : "default"}
                onPress={() => handlePresetBet(preset)}
                isDisabled={isGameActive}
                className="text-xs"
              >
                ${preset}
              </Button>
            ))}
          </div>

          {/* Bet Adjustment Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="bordered"
              onPress={handleHalfBet}
              isDisabled={isGameActive}
              className="flex-1"
            >
              1/2
            </Button>
            <Button
              size="sm"
              variant="bordered"
              onPress={handleDoubleBet}
              isDisabled={isGameActive || betAmount * 2 > balance}
              className="flex-1"
            >
              2x
            </Button>
            <Button
              size="sm"
              variant="bordered"
              onPress={handleMaxBet}
              isDisabled={isGameActive}
              className="flex-1"
            >
              Max
            </Button>
          </div>
        </div>

        <Divider />

        {/* Game Configuration */}
        <div className="space-y-4">
          <h4 className="text-md font-medium">Game Settings</h4>

          <div className="flex justify-between items-center">
            <span className="text-sm">Auto Spin</span>
            <Switch
              isSelected={config.autoSpin || false}
              onValueChange={(value) => onConfigChange({ autoSpin: value })}
              isDisabled={isGameActive}
              size="sm"
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm">Turbo Mode</span>
            <Switch
              isSelected={config.turboMode || false}
              onValueChange={(value) => onConfigChange({ turboMode: value })}
              isDisabled={isGameActive}
              size="sm"
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm">Sound Effects</span>
            <Switch
              isSelected={config.soundEnabled !== false}
              onValueChange={(value) => onConfigChange({ soundEnabled: value })}
              size="sm"
            />
          </div>
        </div>

        <Divider />

        {/* Game Actions */}
        <div className="space-y-3">
          {!gameState ? (
            <Button
              color="primary"
              size="lg"
              onPress={onStartGame}
              isDisabled={!canPlaceBet}
              isLoading={gameStatus === 'loading'}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500"
            >
              {gameStatus === 'loading' ? 'Starting...' : 'Spin to Win!'}
            </Button>
          ) : (
            <div className="space-y-2">
              {gameStatus === 'complete' && (
                <Button
                  color="primary"
                  size="lg"
                  onPress={onNewGame}
                  className="w-full bg-gradient-to-r from-pink-500 to-violet-500"
                >
                  Play Again
                </Button>
              )}

              {isGameActive && (
                <div className="text-center py-4">
                  <Chip
                    color={
                      gameStatus === 'spinning' ? 'primary' :
                        gameStatus === 'evaluating' ? 'warning' :
                          gameStatus === 'cascading' ? 'secondary' :
                            'default'
                    }
                    variant="flat"
                    size="lg"
                  >
                    {gameStatus === 'spinning' && 'Spinning...'}
                    {gameStatus === 'evaluating' && 'Finding Clusters...'}
                    {gameStatus === 'cascading' && 'Cascading...'}
                    {gameStatus === 'loading' && 'Processing...'}
                  </Chip>
                </div>
              )}
            </div>
          )}

          {/* Insufficient Balance Warning */}
          {balance < betAmount && (
            <div className="text-center">
              <Chip color="danger" variant="flat" size="sm">
                Insufficient Balance
              </Chip>
            </div>
          )}
        </div>

        <Divider />

        {/* Current Game Info */}
        {gameState && (
          <div className="space-y-2 text-sm">
            <h4 className="font-medium">Current Game</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-default-500">Bet:</span>
                <span>${gameState.betAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Cascades:</span>
                <span>{gameState.currentCascadeLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Multiplier:</span>
                <span>{gameState.totalMultiplier}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-default-500">Win:</span>
                <span className={gameState.totalPayout > 0 ? 'text-success' : ''}>
                  ${gameState.totalPayout.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Game Rules */}
        <div className="text-xs text-default-500 space-y-1">
          <p><strong>How to Play:</strong></p>
          <p>• Match 5+ connected candy symbols to win</p>
          <p>• Winning symbols explode and new ones cascade down</p>
          <p>• Each cascade level increases your multiplier</p>
          <p>• Wild symbols (⭐) substitute for any candy</p>
        </div>
      </CardBody>
    </Card>
  )
}