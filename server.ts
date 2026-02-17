import * as fs from 'node:fs';
import * as path from 'node:path';

export interface GameState {
  userId: string;
  player: any;
  territories: any[];
  buildings: any[];
  monsters: any[];
  resourceNodes: any[];
  lastSaved: string;
}

const DATA_DIR = path.join(process.cwd(), 'game-data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Game Data Service for server-side persistence
 * This handles saving and loading game state from the server
 */
export class GameDataService {
  /**
   * Save game state to file
   */
  static saveGame(gameState: GameState): { success: boolean; message: string } {
    try {
      const filePath = path.join(DATA_DIR, `${gameState.userId}.json`);
      const dataToSave = {
        ...gameState,
        lastSaved: new Date().toISOString()
      };
      fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2));
      return { success: true, message: 'Game saved successfully' };
    } catch (error) {
      console.error('Error saving game:', error);
      return { success: false, message: 'Failed to save game' };
    }
  }

  /**
   * Load game state from file
   */
  static loadGame(userId: string): GameState | null {
    try {
      const filePath = path.join(DATA_DIR, `${userId}.json`);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const gameState: GameState = JSON.parse(fileContent);
      return gameState;
    } catch (error) {
      console.error('Error loading game:', error);
      return null;
    }
  }

  /**
   * Delete game save file
   */
  static deleteGame(userId: string): { success: boolean; message: string } {
    try {
      const filePath = path.join(DATA_DIR, `${userId}.json`);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true, message: 'Game deleted successfully' };
      }
      
      return { success: false, message: 'Game not found' };
    } catch (error) {
      console.error('Error deleting game:', error);
      return { success: false, message: 'Failed to delete game' };
    }
  }

  /**
   * List all saved games
   */
  static listGames(): string[] {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        return [];
      }

      const files = fs.readdirSync(DATA_DIR);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch (error) {
      console.error('Error listing games:', error);
      return [];
    }
  }

  /**
   * Get last save time for a user
   */
  static getLastSaveTime(userId: string): Date | null {
    try {
      const filePath = path.join(DATA_DIR, `${userId}.json`);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const stats = fs.statSync(filePath);
      return stats.mtime;
    } catch (error) {
      console.error('Error getting last save time:', error);
      return null;
    }
  }
}

