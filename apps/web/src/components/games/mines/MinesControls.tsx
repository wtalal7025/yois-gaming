/**
 * Mines Game Controls Component
 * Handles betting controls, game configuration, and game actions
 */

'use client'

import React from 'react'
import type { MinesConfig, MinesGameState } from '@yois-games/shared'

/**
 * Props for MinesControls component
 */
interface MinesControlsProps {
  config: MinesConfig
  onConfigChange: (config: Partial<MinesConfig>) => void
  betAmount: number
  onBetChange: (amount: number) => void
  balance: number
  minBet: number
  maxBet: number
  gameState: MinesGameState | null
  gameStatus: 'idle' | 'configuring' | 'playing' | 'finished' | 'loading'
  onStartGame: () => void
  onCashOut: () => void
  onNewGame: () => void
}

/**
 * Mines game controls component
 */
export function MinesControls({
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
}: MinesControlsProps) {

  const handleMineCountChange = (count: number) => {
    if (count >= 1 && count <= 24) {
      onConfigChange({ mineCount: count })
    }
  }

  const handleBetAmountChange = (amount: number) => {
    if (amount >= minBet && amount <= maxBet && amount <= balance) {
      onBetChange(amount)
    }
  }

  const getMaxPossibleWin = () => {
    if (!gameState) return 0
    const safeTiles = 25 - config.mineCount
    // Theoretical max if all safe tiles revealed
    let maxMultiplier = 1
    for (let i = 1; i <= safeTiles; i++) {
      const probability = (safeTiles - i + 1) / (25 - i + 1)
      maxMultiplier *= (0.97 / probability)
    }
    return betAmount * maxMultiplier
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">Game Controls</h3>

      {/* Balance Display */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="text-sm text-gray-400">Balance</div>
        <div className="text-2xl font-bold text-green-400">${balance.toFixed(2)}</div>
      </div>

      {/* Bet Amount */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Bet Amount</label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            min={minBet}
            max={Math.min(maxBet, balance)}
            step="0.01"
            value={betAmount}
            onChange={(e) => handleBetAmountChange(parseFloat(e.target.value) || 0)}
            disabled={gameStatus === 'playing' || gameStatus === 'loading'}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={() => handleBetAmountChange(betAmount * 2)}
            disabled={gameStatus === 'playing' || gameStatus === 'loading' || betAmount * 2 > balance}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            2x
          </button>
          <button
            onClick={() => handleBetAmountChange(betAmount / 2)}
            disabled={gameStatus === 'playing' || gameStatus === 'loading' || betAmount / 2 < minBet}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            1/2
          </button>
          <button
            onClick={() => handleBetAmountChange(Math.min(balance, maxBet))}
            disabled={gameStatus === 'playing' || gameStatus === 'loading'}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Max
          </button>
        </div>
        <div className="text-xs text-gray-500">
          Min: ${minBet} • Max: ${Math.min(maxBet, balance).toFixed(2)}
        </div>
      </div>

      {/* Mine Count */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">Number of Mines</label>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="1"
            max="24"
            value={config.mineCount}
            onChange={(e) => handleMineCountChange(parseInt(e.target.value))}
            disabled={gameStatus === 'playing' || gameStatus === 'loading'}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="w-12 text-center">
            <input
              type="number"
              min="1"
              max="24"
              value={config.mineCount}
              onChange={(e) => handleMineCountChange(parseInt(e.target.value) || 1)}
              disabled={gameStatus === 'playing' || gameStatus === 'loading'}
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Higher mines = Higher multipliers, but greater risk
        </div>
      </div>

      {/* Game Stats Preview */}
      <div className="bg-gray-700 rounded-lg p-4 space-y-2">
        <div className="text-sm font-medium text-gray-300">Game Preview</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Safe Tiles:</span>
            <span className="text-white ml-1">{25 - config.mineCount}</span>
          </div>
          <div>
            <span className="text-gray-400">Max Win:</span>
            <span className="text-yellow-400 ml-1">${getMaxPossibleWin().toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Current Game Info */}
      {gameState && (
        <div className="bg-gray-700 rounded-lg p-4 space-y-2">
          <div className="text-sm font-medium text-gray-300">Current Game</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Multiplier:</span>
              <span className="text-green-400 font-semibold">{gameState.currentMultiplier.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Potential Payout:</span>
              <span className="text-yellow-400 font-semibold">${gameState.potentialPayout.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Profit:</span>
              <span className={`font-semibold ${gameState.potentialPayout > gameState.betAmount ? 'text-green-400' : 'text-red-400'}`}>
                ${(gameState.potentialPayout - gameState.betAmount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {!gameState && (
          <button
            onClick={onStartGame}
            disabled={gameStatus === 'loading' || betAmount > balance || betAmount < minBet}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
          >
            {gameStatus === 'loading' ? 'Starting...' : 'Start Game'}
          </button>
        )}

        {gameState && gameState.canCashOut && gameStatus === 'playing' && (
          <button
            onClick={onCashOut}
            disabled={gameStatus === 'loading'}
            className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
          >
            {gameStatus === 'loading' ? 'Cashing Out...' : `Cash Out $${gameState.potentialPayout.toFixed(2)}`}
          </button>
        )}

        {gameState && (gameStatus === 'finished' || gameState.gameStatus === 'lost' || gameState.gameStatus === 'won') && (
          <button
            onClick={onNewGame}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold transition-colors"
          >
            New Game
          </button>
        )}
      </div>

      {/* Auto Settings */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-300">Auto Settings</div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoReveal"
            checked={config.autoReveal || false}
            onChange={(e) => onConfigChange({ autoReveal: e.target.checked })}
            disabled={gameStatus === 'playing' || gameStatus === 'loading'}
            className="rounded"
          />
          <label htmlFor="autoReveal" className="text-sm text-gray-300">
            Auto-reveal adjacent tiles
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoCashout"
              checked={config.autoCashout?.enabled || false}
              onChange={(e) => onConfigChange({
                autoCashout: e.target.checked
                  ? { enabled: true, multiplier: config.autoCashout?.multiplier || 2 }
                  : { enabled: false, multiplier: 2 }
              })}
              disabled={gameStatus === 'playing' || gameStatus === 'loading'}
              className="rounded"
            />
            <label htmlFor="autoCashout" className="text-sm text-gray-300">
              Auto cash-out at
            </label>
            <input
              type="number"
              min="1.1"
              max="1000"
              step="0.1"
              value={config.autoCashout?.multiplier || 2}
              onChange={(e) => onConfigChange({
                autoCashout: {
                  enabled: config.autoCashout?.enabled || false,
                  multiplier: parseFloat(e.target.value) || 2
                }
              })}
              disabled={!config.autoCashout?.enabled || gameStatus === 'playing' || gameStatus === 'loading'}
              className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:border-blue-500 focus:outline-none"
            />
            <span className="text-sm text-gray-300">x</span>
          </div>
        </div>
      </div>

      {/* Risk Warning */}
      <div className="bg-orange-900/30 border border-orange-600 rounded-lg p-3">
        <div className="text-xs text-orange-200">
          ⚠️ <strong>Risk Warning:</strong> More mines mean higher multipliers but greater risk of losing your bet. Always gamble responsibly.
        </div>
      </div>
    </div>
  )
}