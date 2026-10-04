export interface OrderItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderSummary {
  id: string;
  status: string;
  customerId?: string;
  vendorId?: string;
  createdAt?: string;
  items?: OrderItemInput[];
}
