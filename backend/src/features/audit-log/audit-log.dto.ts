// AuditLog DTOs
import { z } from 'zod';

export interface GetApiAdminAuditLogRequestDto {
}

export interface GetApiAdminAuditLogResponseDto {
  id: string;
  action: string;
  userId: string;
  createdAt: string;
}

export interface PostApiAdminAuditLogRequestDto {
  action: string;
  userId: string;
}

export interface PostApiAdminAuditLogResponseDto {
  id: string;
  action: string;
  createdAt: string;
}

export const createAuditEntrySchema = z.object({
  action: z.string().trim().min(1).max(200),
  userId: z.string().min(1),
}).strict();

export type CreateAuditEntryDto = z.infer<typeof createAuditEntrySchema>;
