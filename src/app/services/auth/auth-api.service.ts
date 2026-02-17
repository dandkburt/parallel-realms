import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
}

export interface AuthStatusResponse {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    isAdmin: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly API_BASE = 'http://localhost:3000/api/auth';

  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.API_BASE}/register`, data)
      );
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.API_BASE}/login`, data)
      );
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, message: 'Login failed. Please check your credentials.' };
    }
  }

  async getStatus(userId: string, username?: string): Promise<AuthStatusResponse> {
    try {
      const response = await firstValueFrom(
        this.http.get<AuthStatusResponse>(`${this.API_BASE}/status/${userId}`, {
          params: username ? { username } : undefined
        })
      );
      return response;
    } catch (error) {
      console.error('Status check failed:', error);
      return { success: false, message: 'Status check failed' };
    }
  }
}
