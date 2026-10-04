export interface VendorProfileRequest {
  companyName: string;
  contactEmail: string;
}

export interface VendorProfileResponse {
  id: string;
  companyName: string;
  contactEmail: string;
}

export interface VendorDocumentRequest {
  filename: string;
}

export interface VendorDocument {
  id: string;
  filename: string;
  status: string;
}
