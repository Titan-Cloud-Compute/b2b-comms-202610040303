// OrderManagement DTOs and Zod schemas
import { z } from 'zod';

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

export const confirmOrderSchema = z
  .object({
    estimatedDelivery: z
      .string()
      .refine(
        (val) => {
          const d = new Date(val);
          if (isNaN(d.getTime())) return false;
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          return d.getTime() >= today.getTime();
        },
        { message: 'estimatedDelivery must be a valid date and not in the past' },
      ),
  })
  .strict();

export type ConfirmOrderDto = z.infer<typeof confirmOrderSchema>;
