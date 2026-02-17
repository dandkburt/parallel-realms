import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  authService = inject(AuthService);

  isLoginMode = signal(true);
  username = signal('');
  email = signal('');
  password = signal('');
  message = signal('');
  messageType = signal<'success' | 'error' | ''>('');
  isLoading = signal(false);

  toggleMode(): void {
    this.isLoginMode.update(v => !v);
    this.message.set('');
  }

  async login(): Promise<void> {
    this.isLoading.set(true);
    const result = await this.authService.login(this.username(), this.password());
    this.message.set(result.message);
    this.messageType.set(result.success ? 'success' : 'error');
    this.isLoading.set(false);

    if (result.success) {
      // Clear form
      this.username.set('');
      this.password.set('');
      // Message will be shown and page will redirect
    }
  }

  async register(): Promise<void> {
    this.isLoading.set(true);
    const result = await this.authService.register(this.username(), this.email(), this.password());
    this.message.set(result.message);
    this.messageType.set(result.success ? 'success' : 'error');
    this.isLoading.set(false);

    if (result.success) {
      // Clear form
      this.username.set('');
      this.email.set('');
      this.password.set('');
      // Auto-login was done, page will redirect
      setTimeout(() => {
        this.isLoginMode.set(true);
      }, 1000);
    }
  }

  async submit(): Promise<void> {
    if (this.isLoginMode()) {
      await this.login();
    } else {
      await this.register();
    }
  }
}
