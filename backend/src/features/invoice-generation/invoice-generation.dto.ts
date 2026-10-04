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

export interface GetApiInvoices:idDownloadRequestDto {
}

export interface GetApiInvoices:idDownloadResponseDto {
  id: string;
  downloadUrl: string;
}
