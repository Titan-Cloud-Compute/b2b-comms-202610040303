// AUTO-GENERATED — do not edit by hand

export const ENDPOINTS = {
  getApiAdminAuditLog: { method: 'GET', path: '/api/admin/audit-log', exposesBy: 'audit-log', errors: [] },
  getApiAdminCustomers: { method: 'GET', path: '/api/admin/customers', exposesBy: 'customer-invite', errors: [] },
  getApiChannels: { method: 'GET', path: '/api/channels', exposesBy: 'shared-channel', errors: [] },
  getApiInvoicesByIdDownload: { method: 'GET', path: '/api/invoices/:id/download', exposesBy: 'invoice-generation', errors: [] },
  getApiNotificationsPreferences: { method: 'GET', path: '/api/notifications/preferences', exposesBy: 'notification-preferences', errors: [] },
  getApiOrders: { method: 'GET', path: '/api/orders', exposesBy: 'order-management', errors: [] },
  getApiVendorDocuments: { method: 'GET', path: '/api/vendor/documents', exposesBy: 'vendor-onboarding', errors: [] },
  patchApiOrdersByIdConfirm: { method: 'PATCH', path: '/api/orders/:id/confirm', exposesBy: 'order-management', errors: [] },
  postApiAdminAuditLog: { method: 'POST', path: '/api/admin/audit-log', exposesBy: 'audit-log', errors: [] },
  postApiAdminCustomersInvite: { method: 'POST', path: '/api/admin/customers/invite', exposesBy: 'customer-invite', errors: [] },
  postApiChannels: { method: 'POST', path: '/api/channels', exposesBy: 'shared-channel', errors: [] },
  postApiChannelsByIdMessages: { method: 'POST', path: '/api/channels/:id/messages', exposesBy: 'shared-channel', errors: [] },
  postApiInvoices: { method: 'POST', path: '/api/invoices', exposesBy: 'invoice-generation', errors: [] },
  postApiOrders: { method: 'POST', path: '/api/orders', exposesBy: 'order-management', errors: [] },
  postApiVendorDocuments: { method: 'POST', path: '/api/vendor/documents', exposesBy: 'vendor-onboarding', errors: [] },
  postApiVendorProfile: { method: 'POST', path: '/api/vendor/profile', exposesBy: 'vendor-onboarding', errors: [] },
  putApiNotificationsPreferences: { method: 'PUT', path: '/api/notifications/preferences', exposesBy: 'notification-preferences', errors: [] }
} as const;
