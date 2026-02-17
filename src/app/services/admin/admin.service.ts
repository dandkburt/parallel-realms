import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  gameExists: boolean;
  lastSaved: string | null;
}

export interface AdminUsersResponse {
  success: boolean;
  users: AdminUser[];
  message?: string;
}

export interface AdminActionResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly API_BASE = 'http://localhost:3000/api/admin';

  private buildAdminHeaders(): HttpHeaders | null {
    const adminUser = this.authService.currentUser();
    if (!adminUser?.isAdmin) {
      return null;
    }

    return new HttpHeaders({
      'x-admin-user-id': adminUser.id
    });
  }

  async listUsers(): Promise<AdminUsersResponse> {
    const headers = this.buildAdminHeaders();
    if (!headers) {
      return { success: false, users: [], message: 'Admin authentication required' };
    }

    try {
      return await firstValueFrom(
        this.http.get<AdminUsersResponse>(`${this.API_BASE}/users`, { headers })
      );
    } catch (error) {
      console.error('Failed to load admin users:', error);
      return { success: false, users: [], message: 'Failed to load users' };
    }
  }

  async deleteUser(userId: string): Promise<AdminActionResponse> {
    const headers = this.buildAdminHeaders();
    if (!headers) {
      return { success: false, message: 'Admin authentication required' };
    }

    try {
      return await firstValueFrom(
        this.http.delete<AdminActionResponse>(`${this.API_BASE}/users/${userId}`, { headers })
      );
    } catch (error) {
      console.error('Failed to delete user:', error);
      return { success: false, message: 'Failed to delete user' };
    }
  }

  async deleteGame(userId: string): Promise<AdminActionResponse> {
    const headers = this.buildAdminHeaders();
    if (!headers) {
      return { success: false, message: 'Admin authentication required' };
    }

    try {
      return await firstValueFrom(
        this.http.delete<AdminActionResponse>(`${this.API_BASE}/users/${userId}/game`, { headers })
      );
    } catch (error) {
      console.error('Failed to delete game:', error);
      return { success: false, message: 'Failed to delete game' };
    }
  }

  async createGame(userId: string): Promise<AdminActionResponse> {
    const headers = this.buildAdminHeaders();
    if (!headers) {
      return { success: false, message: 'Admin authentication required' };
    }

    try {
      return await firstValueFrom(
        this.http.post<AdminActionResponse>(`${this.API_BASE}/users/${userId}/game`, {}, { headers })
      );
    } catch (error) {
      console.error('Failed to create game:', error);
      return { success: false, message: 'Failed to create character' };
    }
  }
}
