// AUTO-GENERATED — do not edit by hand

import type { AuditEntry, Channel, Customer, Document, Invoice, Message, NotificationPreference, Order, OrderItem, User, VendorProfile } from './entities';

export const auditEntryFixture: AuditEntry = {
  action: 'action-1',
  createdAt: 'createdAt-1',
  id: 'auditEntry-1',
  userId: 'userId-1',
};

export const channelFixture: Channel = {
  id: 'channel-1',
  name: 'name-1',
  vendorId: 'vendorId-1',
  vendorProfileId: 'vendorProfile-1',
};

export const customerFixture: Customer = {
  email: 'email-1',
  id: 'customer-1',
  userId: 'userId-1',
  userId: 'user-1',
};

export const documentFixture: Document = {
  filename: 'filename-1',
  id: 'document-1',
  status: 'status-1',
  vendorProfileId: 'vendorProfileId-1',
  vendorProfileId: 'vendorProfile-1',
};

export const invoiceFixture: Invoice = {
  amount: 'amount-1',
  id: 'invoice-1',
  orderId: 'orderId-1',
  orderId: 'order-1',
};

export const messageFixture: Message = {
  body: 'body-1',
  channelId: 'channelId-1',
  channelId: 'channel-1',
  id: 'message-1',
  senderId: 'senderId-1',
};

export const notificationPreferenceFixture: NotificationPreference = {
  id: 'notificationPreference-1',
  messageAlerts: true,
  orderAlerts: true,
  userId: 'userId-1',
  userId: 'user-1',
};

export const orderFixture: Order = {
  customerId: 'customerId-1',
  customerId: 'customer-1',
  id: 'order-1',
  status: 'status-1',
  vendorId: 'vendorId-1',
};

export const orderItemFixture: OrderItem = {
  description: 'description-1',
  id: 'orderItem-1',
  orderId: 'orderId-1',
  orderId: 'order-1',
  quantity: 1,
  unitPrice: 'unitPrice-1',
};

export const userFixture: User = {
  createdAt: 'createdAt-1',
  email: 'email-1',
  id: 'user-1',
  role: 'role-1',
};

export const vendorProfileFixture: VendorProfile = {
  companyName: 'companyName-1',
  contactEmail: 'contactEmail-1',
  id: 'vendorProfile-1',
  userId: 'userId-1',
  userId: 'user-1',
};
