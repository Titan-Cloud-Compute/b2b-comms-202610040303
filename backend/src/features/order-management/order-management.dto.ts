import { z } from 'zod';

// ── Zod validation schemas ────────────────────────────────────────────────────

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

export const confirmOrderSchema = z
  .object({
    estimatedDelivery: z.string().refine(
      (val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) return false;
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        return date >= today;
      },
      { message: 'estimatedDelivery must be a valid date not in the past' },
    ),
  })
  .strict();

// ── Inferred TS types ─────────────────────────────────────────────────────────

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type ConfirmOrderDto = z.infer<typeof confirmOrderSchema>;

// ── Response shape interfaces ─────────────────────────────────────────────────

export interface PostApiOrdersResponseDto {
  id: string;
  status: string;
  customerId: string;
}

export interface PatchApiOrdersConfirmResponseDto {
  id: string;
  status: string;
  estimatedDelivery: string;
}

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
