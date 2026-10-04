export interface NavItem {
  path: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  tab?: string;
  /** Sidebar group label (Main / Vendor / Customer / Admin). Defaults to Main. */
  group?: NavGroup;
}

export type NavGroup = 'Main' | 'Vendor' | 'Customer' | 'Admin';

/** Sidebar group order. */
export const NAV_GROUPS: NavGroup[] = ['Main', 'Vendor', 'Customer', 'Admin'];

/** Entries shown to signed-in users (non-admin shell). */
export const FIRM_NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    group: 'Main',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  },
];

/** Entries shown to EVERY signed-in role, rendered outside the role branches. */
export const SHARED_NAV_ITEMS: NavItem[] = [];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    path: '/admin/overview',
    label: 'Overview',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
    adminOnly: true,
    tab: 'overview',
  },
  {
    path: '/admin/users',
    label: 'Users',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    adminOnly: true,
    tab: 'users',
  },
  {
    path: '/admin/app-settings',
    label: 'App Settings',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8 7 17M17 7l2.8-2.8"/></svg>',
    adminOnly: true,
    tab: 'app-settings',
  },
];

export const ADMIN_TAB_MAP: Record<string, string> = {
  'Overview': 'overview',
  'Users': 'users',
  'App Settings': 'app-settings',
};
// <<codegen:nav-items:start>>
FIRM_NAV_ITEMS.push(
  { path: '/vendor/profile', label: 'Vendor Profile', icon: '', group: 'Vendor' },
  { path: '/admin/customers', label: 'Customer Management', icon: '', group: 'Admin' },
  { path: '/channels', label: 'Channels', icon: '', group: 'Vendor' },
  { path: '/orders', label: 'Orders', icon: '', group: 'Customer' },
  { path: '/invoices', label: 'Invoices', icon: '', group: 'Vendor' },
  { path: '/settings/notifications', label: 'Notification Settings', icon: '', group: 'Vendor' },
  { path: '/admin/audit-log', label: 'Audit Log', icon: '', group: 'Admin' },
);
// <<codegen:nav-items:end>>

// Main-group Settings entry (card: /settings — nav Main). Appended after the
// codegen block so the dashboard + feature entries keep their bottom-nav order.
FIRM_NAV_ITEMS.push({
  path: '/settings',
  label: 'Settings',
  group: 'Main',
  icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8 7 17M17 7l2.8-2.8"/></svg>',
});
