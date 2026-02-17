import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AdminService, AdminUser } from '../../services/admin/admin.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  authService = inject(AuthService);
  private readonly router = inject(Router);

  users = signal<AdminUser[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit(): void {
    this.authService.refreshAdminStatus()
      .then((isAdmin) => {
        if (!isAdmin) {
          this.router.navigateByUrl('/');
          return;
        }

        this.refresh();
      })
      .catch(() => this.router.navigateByUrl('/'));
  }

  async refresh(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const response = await this.adminService.listUsers();
    if (response.success) {
      this.users.set(response.users);
    } else {
      this.users.set([]);
      this.errorMessage.set(response.message ?? 'Failed to load users');
    }

    this.isLoading.set(false);
  }

  async deleteUser(user: AdminUser): Promise<void> {
    if (this.isLoading()) return;

    if (!confirm(`Delete user ${user.username}? This cannot be undone.`)) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const response = await this.adminService.deleteUser(user.id);
    if (response.success) {
      this.users.update(existing => existing.filter(item => item.id !== user.id));
      this.successMessage.set(response.message);
    } else {
      this.errorMessage.set(response.message);
    }

    this.isLoading.set(false);
  }

  async deleteGame(user: AdminUser): Promise<void> {
    if (this.isLoading()) return;

    if (!confirm(`Delete game data for ${user.username}?`)) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const response = await this.adminService.deleteGame(user.id);
    if (response.success) {
      this.users.update(existing =>
        existing.map(item =>
          item.id === user.id
            ? { ...item, gameExists: false, lastSaved: null }
            : item
        )
      );
      this.successMessage.set(response.message);
    } else {
      this.errorMessage.set(response.message);
    }

    this.isLoading.set(false);
  }

  async createGame(user: AdminUser): Promise<void> {
    if (this.isLoading()) return;

    if (!confirm(`Create a new character for ${user.username}?`)) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const response = await this.adminService.createGame(user.id);
    if (response.success) {
      this.users.update(existing =>
        existing.map(item =>
          item.id === user.id
            ? { ...item, gameExists: true, lastSaved: new Date().toISOString() }
            : item
        )
      );
      this.successMessage.set(response.message);
    } else {
      this.errorMessage.set(response.message);
    }

    this.isLoading.set(false);
  }

  isSelf(user: AdminUser): boolean {
    return this.authService.currentUser()?.id === user.id;
  }
}
