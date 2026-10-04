// AUTO-GENERATED — do not edit by hand

export interface AuditEntry {
  action: string;
  createdAt: string;
  id: string;
  userId: string;
}

export interface Channel {
  id: string;
  name: string;
  vendorId: string;
  vendorProfileId: string;
}

export interface Customer {
  email: string;
  id: string;
  userId: string;
  userId: string;
}

export interface Document {
  filename: string;
  id: string;
  status: string;
  vendorProfileId: string;
  vendorProfileId: string;
}

export interface Invoice {
  amount: string;
  id: string;
  orderId: string;
  orderId: string;
}

export interface Message {
  body: string;
  channelId: string;
  channelId: string;
  id: string;
  senderId: string;
}

export interface NotificationPreference {
  id: string;
  messageAlerts: boolean;
  orderAlerts: boolean;
  userId: string;
  userId: string;
}

export interface Order {
  customerId: string;
  customerId: string;
  id: string;
  status: string;
  vendorId: string;
}

export interface OrderItem {
  description: string;
  id: string;
  orderId: string;
  orderId: string;
  quantity: number;
  unitPrice: string;
}

export interface User {
  createdAt: string;
  email: string;
  id: string;
  role: string;
}

export interface VendorProfile {
  companyName: string;
  contactEmail: string;
  id: string;
  userId: string;
  userId: string;
}

export const ENTITY_NAMES = ['AuditEntry', 'Channel', 'Customer', 'Document', 'Invoice', 'Message', 'NotificationPreference', 'Order', 'OrderItem', 'User', 'VendorProfile'] as const;
