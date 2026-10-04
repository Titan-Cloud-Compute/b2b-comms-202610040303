// OrderManagement DTOs
import { z } from 'zod';

// ─── Create Order ────────────────────────────────────────────────────────────

export const createOrderSchema = z
  .object({
    vendorId: z.string().min(1),
    items: z
      .array(
        z
          .object({
            description: z.string().trim().min(1).max(500),
            quantity: z.number().int().positive(),
            unitPrice: z.number().nonnegative(),
          })
          .strict(),
      )
      .max(100)
      .default([]),
  })
  .strict();

export type CreateOrderDto = z.infer<typeof createOrderSchema>;

export interface PostApiOrdersResponseDto {
  id: string;
  status: string;
  customerId: string;
}

// ─── Confirm Order ───────────────────────────────────────────────────────────

export const confirmOrderSchema = z
  .object({
    estimatedDelivery: z.string().refine(
      (val) => {
        const d = new Date(val);
        if (isNaN(d.getTime())) return false;
        const todayUtc = new Date();
        todayUtc.setUTCHours(0, 0, 0, 0);
        return d >= todayUtc;
      },
      { message: 'estimatedDelivery must be a valid date not before today (UTC)' },
    ),
  })
  .strict();

export type ConfirmOrderDto = z.infer<typeof confirmOrderSchema>;

export interface PatchApiOrdersConfirmResponseDto {
  id: string;
  status: string;
  estimatedDelivery: string;
}

// ─── List Orders ─────────────────────────────────────────────────────────────

export interface GetApiOrdersResponseItemDto {
  id: string;
  status: string;
  customerId: string;
  vendorId: string;
  createdAt: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}
