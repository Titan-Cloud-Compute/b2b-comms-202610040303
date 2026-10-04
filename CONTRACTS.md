# Contracts

**Spec version:** 4


## Entities

| Entity | Owner | Writers |
| --- | --- | --- |
| User | customer-invite | customer-invite |
| VendorProfile | vendor-onboarding | vendor-onboarding |
| Customer | customer-invite | customer-invite |
| Document | vendor-onboarding | vendor-onboarding |
| Channel | shared-channel | shared-channel |
| Message | shared-channel | shared-channel |
| Order | order-management | order-management |
| OrderItem | order-management | order-management |
| Invoice | invoice-generation | invoice-generation |
| NotificationPreference | notification-preferences | notification-preferences |
| AuditEntry | audit-log | audit-log |

## API Endpoints

| Method | Path | Mode | Story |
| --- | --- | --- | --- |
| POST | /api/vendor/profile | exposes | vendor-onboarding |
| POST | /api/vendor/documents | exposes | vendor-onboarding |
| GET | /api/vendor/documents | exposes | vendor-onboarding |
| POST | /api/admin/customers/invite | exposes | customer-invite |
| GET | /api/admin/customers | exposes | customer-invite |
| POST | /api/channels | exposes | shared-channel |
| POST | /api/channels/:id/messages | exposes | shared-channel |
| GET | /api/channels | exposes | shared-channel |
| POST | /api/orders | exposes | order-management |
| PATCH | /api/orders/:id/confirm | exposes | order-management |
| GET | /api/orders | exposes | order-management |
| POST | /api/invoices | exposes | invoice-generation |
| GET | /api/invoices/:id/download | exposes | invoice-generation |
| PUT | /api/notifications/preferences | exposes | notification-preferences |
| GET | /api/notifications/preferences | exposes | notification-preferences |
| GET | /api/admin/audit-log | exposes | audit-log |
| POST | /api/admin/audit-log | exposes | audit-log |

## Routes

| Path | Story |
| --- | --- |
| /vendor/profile | vendor-onboarding |
| /admin/customers | customer-invite |
| /channels | shared-channel |
| /orders | order-management |
| /invoices | invoice-generation |
| /settings/notifications | notification-preferences |
| /admin/audit-log | audit-log |
