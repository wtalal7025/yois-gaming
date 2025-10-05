/**
 * BarsControls Component
 * Handles betting controls, payline selection, and game actions
 */

'use client'

import React from 'react'
import { Card, CardBody, CardHeader, Button, Slider, Switch, Chip } from '@heroui/react'
import type { BarsConfig, BarsGameState } from '@yois-games/shared'

/**
 * Props for BarsControls component
 */
interface BarsControlsProps {
  config: BarsConfig
  onConfigChange: (newConfig: Partial<BarsConfig>) => void
  balance: number
  totalBet: number
  minBet: number
  maxBet: number
  gameState: BarsGameState | null
  gameStatus: string
  onSpin: () => void
  onAutoSpin: (count: number) => void
  onStopAutoSpin: () => void
  onNewGame: () => void
  isAutoSpin: boolean
  autoSpinCount: number
}

/**
 * Main BarsControls component
 */
export const BarsControls: React.FC<BarsControlsProps> = ({
  config,
  onConfigChange,
  balance,
  totalBet,
  minBet,
  maxBet,
  gameState,
  gameStatus,
  onSpin,
  onAutoSpin,
  onStopAutoSpin,
  onNewGame,
  isAutoSpin,
  autoSpinCount
}) => {
  // Calculate max bet per line based on balance and paylines
  const maxBetPerLine = Math.min(
    maxBet / config.activePaylines,
    balance / config.activePaylines
  )

  // Handle bet per line change
  const handleBetPerLineChange = (value: number | number[]) => {
    const newBetPerLine = Array.isArray(value) ? (value[0] ?? config.betPerLine ?? 1) : value
    // Reason: TypeScript strict mode requires defined values - fallback to current betPerLine or default 1 if array value is undefined
    onConfigChange({ betPerLine: newBetPerLine })
  }

  // Handle active paylines change
  const handlePaylinesChange = (paylines: number) => {
    onConfigChange({ activePaylines: paylines })
  }

  // Handle turbo mode toggle
  const handleTurboModeChange = (enabled: boolean) => {
    onConfigChange({ turboMode: enabled })
  }

  // Handle sound toggle
  const handleSoundChange = (enabled: boolean) => {
    onConfigChange({ soundEnabled: enabled })
  }

  // Handle max bet button
  const handleMaxBet = () => {
    const maxPossibleBetPerLine = Math.min(maxBetPerLine, 10) // Cap at reasonable amount
    onConfigChange({ betPerLine: maxPossibleBetPerLine })
  }

  // Auto-spin options
  const autoSpinOptions = [10, 25, 50, 100, 250]

  // Determine if controls should be disabled
  const isDisabled = gameStatus === 'spinning' || gameStatus === 'loading'
  const canSpin = !isDisabled && totalBet <= balance && totalBet >= minBet

  return (
    <div className="space-y-4">
      {/* Balance Display */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-lg font-semibold">Balance</h3>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="text-center">
            <div className="text-3xl font-bold text-success">
              ${balance.toFixed(2)}
            </div>
            <div className="text-sm text-default-500 mt-1">
              Current Balance
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Bet Configuration */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-lg font-semibold">Bet Settings</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Paylines Selection */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">Active Paylines</span>
              <Chip variant="flat" color="primary">
                {config.activePaylines}
              </Chip>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(lines => (
                <Button
                  key={lines}
                  size="sm"
                  variant={config.activePaylines === lines ? "solid" : "bordered"}
                  color={config.activePaylines === lines ? "primary" : "default"}
                  onPress={() => handlePaylinesChange(lines)}
                  isDisabled={isDisabled}
                  className="text-xs"
                >
                  {lines}
                </Button>
              ))}
            </div>
          </div>

          {/* Bet Per Line */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">Bet Per Line</span>
              <Chip variant="flat" color="secondary">
                ${config.betPerLine.toFixed(2)}
              </Chip>
            </div>
            <Slider
              size="sm"
              step={0.01}
              minValue={0.01}
              maxValue={maxBetPerLine}
              value={config.betPerLine}
              onChange={handleBetPerLineChange}
              isDisabled={isDisabled}
              className="max-w-full"
            />
            <div className="flex justify-between text-xs text-default-400 mt-1">
              <span>$0.01</span>
              <span>${maxBetPerLine.toFixed(2)}</span>
            </div>
          </div>

          {/* Total Bet Display */}
          <div className="bg-default-100 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Bet</span>
              <div className="text-right">
                <div className="text-lg font-bold">
                  ${totalBet.toFixed(2)}
                </div>
                <div className="text-xs text-default-500">
                  {config.activePaylines} × ${config.betPerLine.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Bet Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="bordered"
              onPress={handleMaxBet}
              isDisabled={isDisabled}
            >
              Max Bet
            </Button>
            <Button
              size="sm"
              variant="bordered"
              onPress={() => onConfigChange({ betPerLine: 0.01 })}
              isDisabled={isDisabled}
            >
              Min Bet
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Game Controls */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-lg font-semibold">Game Controls</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Main Spin Button */}
          <Button
            color="primary"
            size="lg"
            className="w-full font-bold text-lg"
            onPress={onSpin}
            isDisabled={!canSpin || isAutoSpin}
            isLoading={isDisabled && !isAutoSpin}
          >
            {isAutoSpin
              ? `Auto Spinning (${autoSpinCount})`
              : gameStatus === 'spinning'
                ? 'Spinning...'
                : 'SPIN'
            }
          </Button>

          {/* Auto Spin Controls */}
          <div>
            <div className="text-sm font-medium mb-2">Auto Spin</div>
            {!isAutoSpin ? (
              <div className="grid grid-cols-3 gap-2">
                {autoSpinOptions.map(count => (
                  <Button
                    key={count}
                    size="sm"
                    variant="bordered"
                    onPress={() => onAutoSpin(count)}
                    isDisabled={!canSpin}
                    className="text-xs"
                  >
                    {count}
                  </Button>
                ))}
              </div>
            ) : (
              <Button
                color="danger"
                variant="solid"
                size="sm"
                className="w-full"
                onPress={onStopAutoSpin}
              >
                Stop Auto Spin ({autoSpinCount} left)
              </Button>
            )}
          </div>

          {/* Game Settings */}
          <div className="space-y-3 pt-2 border-t border-default-200">
            <div className="flex justify-between items-center">
              <span className="text-sm">Turbo Mode</span>
              <Switch
                size="sm"
                isSelected={config.turboMode ?? false}
                onValueChange={handleTurboModeChange}
                isDisabled={isDisabled}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Sound Effects</span>
              <Switch
                size="sm"
                isSelected={config.soundEnabled ?? false}
                onValueChange={handleSoundChange}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Game Information */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-lg font-semibold">Game Info</h3>
        </CardHeader>
        <CardBody className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-default-500">Status</div>
              <div className="font-medium capitalize">
                {gameStatus.replace('-', ' ')}
              </div>
            </div>
            <div>
              <div className="text-default-500">RTP</div>
              <div className="font-medium">96.50%</div>
            </div>
            {gameState && (
              <>
                <div>
                  <div className="text-default-500">Current Win</div>
                  <div className="font-medium text-success">
                    ${gameState.totalPayout.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-default-500">Multiplier</div>
                  <div className="font-medium">
                    {gameState.totalMultiplier.toFixed(2)}x
                  </div>
                </div>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* New Game Button */}
      {(gameStatus === 'finished' || gameState) && (
        <Button
          variant="bordered"
          className="w-full"
          onPress={onNewGame}
          size="lg"
        >
          New Game
        </Button>
      )}

      {/* Warning Messages */}
      {totalBet > balance && (
        <div className="bg-danger/10 border border-danger/20 rounded-lg p-3">
          <p className="text-danger text-sm font-medium">
            Insufficient balance for this bet amount
          </p>
        </div>
      )}

      {totalBet < minBet && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
          <p className="text-warning text-sm font-medium">
            Minimum bet is ${minBet.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  )
}