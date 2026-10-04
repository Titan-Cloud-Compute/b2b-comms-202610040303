import { Routes } from '@angular/router';

/**
 * Feature route registry.
 *
 * Each story appends its Angular routes to this array.
 * app.routes.ts spreads FEATURE_ROUTES before the wildcard catch-all so new
 * feature routes are picked up automatically.
 *
 * Example (in features/my-feature/my-feature.routes.ts):
 *
 *   import { FEATURE_ROUTES } from '../index';
 *   FEATURE_ROUTES.push({ path: 'my-feature', loadComponent: () => ... });
 *
 * Or add routes here directly.
 */
export const FEATURE_ROUTES: Routes = [];
// <<codegen:feature-routes:start>>
FEATURE_ROUTES.push(
  { path: 'vendor/profile', loadComponent: () => import('./vendor-onboarding/vendor-onboarding.component').then(m => m.VendorOnboardingComponent) },
  { path: 'admin/customers', loadComponent: () => import('./admin-customers/admin-customers.component').then(m => m.AdminCustomersComponent) },
  { path: 'channels', loadComponent: () => import('./channels/channels.component').then(m => m.ChannelsComponent) },
  { path: 'orders', loadComponent: () => import('./orders/orders.component').then(m => m.OrdersComponent) },
  { path: 'invoices', loadComponent: () => import('./invoices/invoices.component').then(m => m.InvoicesComponent) },
  { path: 'settings/notifications', loadComponent: () => import('./settings-notifications/settings-notifications.component').then(m => m.SettingsNotificationsComponent) },
  { path: 'admin/audit-log', loadComponent: () => import('./admin-audit-log/admin-audit-log.component').then(m => m.AdminAuditLogComponent) },
);
// <<codegen:feature-routes:end>>
