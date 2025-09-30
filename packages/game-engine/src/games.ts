/**
 * Game implementations
 * Contains game engine classes for each supported game type
 */

import { BaseGame } from './base';
import { MinesGame } from './games/mines/MinesGame';
import { SugarRushGame } from './games/sugar-rush/SugarRushGame';
import { DragonTowerGame } from './games/dragon-tower/DragonTowerGame';
import { CrashGame } from './games/crash/CrashGame';
import { BarsGame } from './games/bars/BarsGame';
import { LimboGame } from './games/limbo/LimboGame';
import type { GameType } from '@stake-games/shared';

/**
 * Game registry
 * Maps game types to their implementations
 */
export const GAME_REGISTRY: Record<GameType, typeof BaseGame> = {
  'crash': CrashGame, // Crash game implemented
  'limbo': LimboGame, // Limbo game implemented
  'mines': MinesGame, // Mines game implemented
  'sugar-rush': SugarRushGame, // Sugar Rush game implemented
  'bars': BarsGame, // Bars game implemented
  'dragon-tower': DragonTowerGame, // Dragon Tower game implemented
};

// Export individual game classes
export { MinesGame, SugarRushGame, DragonTowerGame, CrashGame, BarsGame, LimboGame };