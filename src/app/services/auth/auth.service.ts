import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthApiService } from './auth-api.service';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly authApi = inject(AuthApiService);

  // Current authenticated user
  currentUser = signal<AuthUser | null>(null);
  isAuthenticated = signal(false);

  // Store current user in localStorage for session persistence
  private readonly CURRENT_USER_KEY = 'parallel-realms-current-user';

  constructor() {
    // Check if user is already logged in (only in browser)
    if (this.isBrowser) {
      this.checkStoredUser();
    }
  }

  private checkStoredUser(): void {
    if (!this.isBrowser) return;
    
    const storedUser = localStorage.getItem(this.CURRENT_USER_KEY);
    if (storedUser) {
      const user = JSON.parse(storedUser);
      this.currentUser.set(user);
      this.isAuthenticated.set(true);
      this.refreshAdminStatus().catch(err => console.error('Failed to refresh admin status:', err));
    }
  }

  async register(username: string, email: string, password: string): Promise<{ success: boolean; message: string }> {
    // Client-side validation
    if (!username || username.length < 3) {
      return { success: false, message: 'Username must be at least 3 characters' };
    }
    if (!email?.includes('@')) {
      return { success: false, message: 'Invalid email address' };
    }
    if (!password || password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters' };
    }

    // Call backend API
    const response = await this.authApi.register({ username, email, password });

    if (response.success && response.user) {
      // Automatically login after registration
      this.currentUser.set(response.user);
      this.isAuthenticated.set(true);
      if (this.isBrowser) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(response.user));
      }
    }

    return response;
  }

  async login(username: string, password: string): Promise<{ success: boolean; message: string }> {
    if (!username || !password) {
      return { success: false, message: 'Username and password required' };
    }

    // Call backend API
    const response = await this.authApi.login({ username, password });

    if (response.success && response.user) {
      // Login successful
      this.currentUser.set(response.user);
      this.isAuthenticated.set(true);
      if (this.isBrowser) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(response.user));
      }
    }

    return response;
  }

  logout(): void {
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    if (this.isBrowser) {
      localStorage.removeItem(this.CURRENT_USER_KEY);
    }
  }

  async refreshAdminStatus(): Promise<boolean> {
    const user = this.currentUser();
    if (!user) return false;

    const response = await this.authApi.getStatus(user.id, user.username);
    if (response.success && response.user) {
      const updatedUser = { ...user, id: response.user.id, isAdmin: response.user.isAdmin };
      this.currentUser.set(updatedUser);
      if (this.isBrowser) {
        localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(updatedUser));
      }
      return response.user.isAdmin;
    }

    return user.isAdmin;
  }
}
