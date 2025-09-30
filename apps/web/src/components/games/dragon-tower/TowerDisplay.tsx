/**
 * Dragon Tower Display Component
 * Renders the 9-level tower with interactive tiles for each level
 */

'use client'

import React, { useMemo } from 'react'
import { Card, CardBody, Button, Chip } from '@heroui/react'
import { motion, AnimatePresence } from 'framer-motion'
import type { 
  DragonTowerGameState, 
  DragonTowerLevel,
  DragonTowerTile,
  DragonTowerDifficulty 
} from '@stake-games/shared'

/**
 * Props for TowerDisplay component
 */
interface TowerDisplayProps {
  gameState: DragonTowerGameState
  onTileSelect: (levelId: number, tileId: number) => void
  disabled?: boolean
}

/**
 * Get tile colors based on state and theme
 */
const getTileColors = (tile: DragonTowerTile, isActive: boolean) => {
  if (!tile.isRevealed) {
    return isActive 
      ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 cursor-pointer transform hover:scale-105'
      : 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed opacity-60'
  }
  
  if (tile.state === 'safe') {
    return 'bg-gradient-to-r from-green-500 to-emerald-600 cursor-not-allowed'
  }
  
  if (tile.state === 'egg') {
    return 'bg-gradient-to-r from-red-500 to-red-700 cursor-not-allowed'
  }
  
  return 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed'
}

/**
 * Get tile icon based on state
 */
const getTileIcon = (tile: DragonTowerTile) => {
  if (!tile.isRevealed) {
    return '?'
  }
  
  if (tile.state === 'safe') {
    return '💎' // Diamond for safe tiles
  }
  
  if (tile.state === 'egg') {
    return '🥚' // Egg for danger tiles
  }
  
  return '?'
}

/**
 * Individual tower level component
 */
const TowerLevel = React.memo(({ 
  level, 
  isActive, 
  onTileSelect, 
  disabled 
}: {
  level: DragonTowerLevel
  isActive: boolean
  onTileSelect: (levelId: number, tileId: number) => void
  disabled: boolean
}) => {
  const handleTileClick = (tileId: number) => {
    if (disabled || !isActive || level.tiles[tileId]?.isRevealed) {
      return
    }
    onTileSelect(level.id, tileId)
  }

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (9 - level.id) * 0.1 }}
    >
      <Card 
        className={`mb-2 border-2 ${
          isActive 
            ? 'border-primary bg-primary/5' 
            : level.isCompleted 
              ? 'border-success bg-success/5' 
              : 'border-default-200'
        }`}
      >
        <CardBody className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Chip
                color={isActive ? 'primary' : level.isCompleted ? 'success' : 'default'}
                variant="flat"
                size="sm"
              >
                Level {level.id}
              </Chip>
              {level.isCompleted && (
                <Chip color="success" variant="flat" size="sm">
                  ✓ Completed
                </Chip>
              )}
              {isActive && (
                <Chip color="primary" variant="flat" size="sm" className="animate-pulse">
                  Current
                </Chip>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">
                {level.multiplier.toFixed(2)}x
              </div>
              <div className="text-xs text-default-500">
                Multiplier
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 justify-center">
            {level.tiles.map((tile) => (
              <motion.div
                key={tile.id}
                whileHover={isActive && !tile.isRevealed ? { scale: 1.05 } : {}}
                whileTap={isActive && !tile.isRevealed ? { scale: 0.95 } : {}}
              >
                <Button
                  className={`
                    w-16 h-16 text-white font-bold text-lg transition-all duration-300
                    ${getTileColors(tile, isActive)}
                  `}
                  onPress={() => handleTileClick(tile.id)}
                  isDisabled={disabled || !isActive || tile.isRevealed}
                >
                  <span className="text-xl">
                    {getTileIcon(tile)}
                  </span>
                </Button>
              </motion.div>
            ))}
          </div>
        </CardBody>
      </Card>
    </motion.div>
  )
})

TowerLevel.displayName = 'TowerLevel'

/**
 * Main tower display component
 */
export function TowerDisplay({ gameState, onTileSelect, disabled = false }: TowerDisplayProps) {
  // Memoize the sorted levels for consistent rendering
  const sortedLevels = useMemo(() => {
    return [...gameState.levels].sort((a, b) => b.id - a.id) // Render from top to bottom (9 to 1)
  }, [gameState.levels])

  // Get difficulty info for display
  const getDifficultyColor = (difficulty: DragonTowerDifficulty) => {
    switch (difficulty) {
      case 'easy': return 'success'
      case 'medium': return 'warning' 
      case 'hard': return 'danger'
      case 'expert': return 'secondary'
      default: return 'default'
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-2">
      {/* Tower header with difficulty and progress */}
      <Card className="mb-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
        <CardBody className="text-center text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Dragon Tower</h2>
              <div className="flex items-center gap-2 mt-1">
                <Chip 
                  color={getDifficultyColor(gameState.difficulty)}
                  variant="flat"
                  size="sm"
                  className="text-white"
                >
                  {gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1)}
                </Chip>
                <span className="text-sm opacity-90">
                  Level {gameState.currentLevel}/{gameState.levels.length}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {gameState.currentMultiplier.toFixed(2)}x
              </div>
              <div className="text-sm opacity-90">
                Current Multiplier
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-default-600 mb-1">
          <span>Progress</span>
          <span>{gameState.completedLevels}/9 levels</span>
        </div>
        <div className="w-full bg-default-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(gameState.completedLevels / 9) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Tower levels */}
      <div className="space-y-1">
        <AnimatePresence>
          {sortedLevels.map((level) => (
            <TowerLevel
              key={level.id}
              level={level}
              isActive={level.isActive}
              onTileSelect={onTileSelect}
              disabled={disabled}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <Card className="mt-4">
        <CardBody className="p-3">
          <div className="text-sm font-semibold mb-2">Legend:</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded"></div>
              <span>Hidden</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded flex items-center justify-center text-white text-xs">
                💎
              </div>
              <span>Safe</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-red-700 rounded flex items-center justify-center text-white text-xs">
                🥚
              </div>
              <span>Egg</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}