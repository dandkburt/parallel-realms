import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Player, Territory, Building, Monster, ResourceNode } from '../../models/game.models';

export interface GameState {
  userId: string;
  player: Player;
  territories: Territory[];
  buildings: Building[];
  monsters: Monster[];
  resourceNodes: ResourceNode[];
  hasPlacedFirstFlag: boolean;
  lastSaved: Date;
}

@Injectable({
  providedIn: 'root'
})
export class GameApiService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE = 'http://localhost:3000/api/game';
  private readonly ECONOMY_BASE = 'http://localhost:3000/api/economy';

  async saveGame(gameState: GameState): Promise<{ success: boolean; message: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; message: string }>(`${this.API_BASE}/save`, gameState)
      );
      return response;
    } catch (error) {
      console.error('Failed to save game:', error);
      return { success: false, message: 'Failed to save game' };
    }
  }

  async loadGame(userId: string): Promise<GameState | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<GameState>(`${this.API_BASE}/load/${userId}`)
      );
      return response;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }

  async deleteGame(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await firstValueFrom(
        this.http.delete<{ success: boolean; message: string }>(`${this.API_BASE}/delete/${userId}`)
      );
      return response;
    } catch (error) {
      console.error('Failed to delete game:', error);
      return { success: false, message: 'Failed to delete game' };
    }
  }

  async recordSpend(amount: number): Promise<{ success: boolean; ownerBankGold?: number; message?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; ownerBankGold?: number; message?: string }>(
          `${this.ECONOMY_BASE}/spend`,
          { amount }
        )
      );
      return response;
    } catch (error) {
      console.error('Failed to record spend:', error);
      return { success: false, message: 'Failed to record spend' };
    }
  }

  async getOwnerBank(adminUserId: string): Promise<{ success: boolean; ownerBankGold?: number; message?: string }> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; ownerBankGold?: number; message?: string }>(
          `${this.ECONOMY_BASE}/bank`,
          { headers: { 'x-admin-user-id': adminUserId } }
        )
      );
      return response;
    } catch (error) {
      console.error('Failed to load owner bank:', error);
      return { success: false, message: 'Failed to load owner bank' };
    }
  }
}
