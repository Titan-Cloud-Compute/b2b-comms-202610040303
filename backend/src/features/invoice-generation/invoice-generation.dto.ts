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

export interface GetApiInvoicesDownloadRequestDto {
}

export interface GetApiInvoicesDownloadResponseDto {
  id: string;
  downloadUrl: string;
}
