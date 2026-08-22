import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  { path: 'signup', loadComponent: () => import('./pages/signup/signup').then(m => m.Signup) },
  { path: 'forgot-password', loadComponent: () => import('./pages/forgot-password/forgot-password').then(m => m.ForgotPassword) },
  { path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password').then(m => m.ResetPassword) },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard) },
  { path: 'my-vehicles', loadComponent: () => import('./pages/view-plates/view-plates').then(m => m.ViewPlates) },
  { path: 'find-my-car', loadComponent: () => import('./pages/find-car/find-car').then(m => m.FindCar) },
  { path: 'spots', loadComponent: () => import('./pages/view-parking-spots/view-parking-spots').then(m => m.ViewParkingSpots) },
  { path: 'parking-spots', redirectTo: 'spots' }, // Legacy/Typo support
  { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications').then(m => m.Notifications) },
  { path: 'analytics', loadComponent: () => import('./pages/analytics/analytics').then(m => m.Analytics) },
  { path: 'history', loadComponent: () => import('./pages/history/history').then(m => m.History) }
];
