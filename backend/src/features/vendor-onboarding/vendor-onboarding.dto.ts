// VendorOnboarding DTOs

import { z } from 'zod';

export const CreateProfileSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  contactEmail: z.string().trim().email(),
});

export const CreateDocumentSchema = z.object({
  filename: z.string().trim().min(1).max(255),
});

export type CreateProfileDto = z.infer<typeof CreateProfileSchema>;
export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>;

export interface PostApiVendorProfileRequestDto {
  companyName: string;
  contactEmail: string;
}

export interface PostApiVendorProfileResponseDto {
  id: string;
  companyName: string;
  contactEmail: string;
}

export interface PostApiVendorDocumentsRequestDto {
  filename: string;
}

export interface PostApiVendorDocumentsResponseDto {
  id: string;
  filename: string;
  status: string;
}

export interface GetApiVendorDocumentsRequestDto {}

export interface GetApiVendorDocumentsResponseDto {
  id: string;
  filename: string;
  status: string;
}
