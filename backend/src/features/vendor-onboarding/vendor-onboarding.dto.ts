// VendorOnboarding DTOs

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

export interface GetApiVendorDocumentsRequestDto {
}

export interface GetApiVendorDocumentsResponseDto {
  id: string;
  filename: string;
  status: string;
}
