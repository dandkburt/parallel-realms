import { inject, PLATFORM_ID } from '@angular/core';
import { Routes, CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './services/auth/auth.service';

const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const user = authService.currentUser();

  if (user) {
    return true;
  }

  return router.parseUrl('/');
};

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/game/game.component').then(m => m.GameComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard]
  }
];
