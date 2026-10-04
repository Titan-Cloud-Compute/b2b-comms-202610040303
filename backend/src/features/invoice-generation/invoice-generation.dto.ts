// InvoiceGeneration DTOs

export interface PostApiInvoicesRequestDto {
  orderId: string;
  amount: number;
}

export interface PostApiInvoicesResponseDto {
  id: string;
  orderId: string;
  amount: number;
}

export interface GetApiInvoiceDownloadRequestDto {
  id: string;
}

export interface GetApiInvoiceDownloadResponseDto {
  id: string;
  downloadUrl: string;
}
