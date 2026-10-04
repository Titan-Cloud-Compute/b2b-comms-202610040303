// OrderManagement DTOs

export interface PostApiOrdersRequestDto {
  vendorId: string;
}

export interface PostApiOrdersResponseDto {
  id: string;
  status: string;
  customerId: string;
}

export interface PatchApiOrders:idConfirmRequestDto {
  estimatedDelivery: string;
}

export interface PatchApiOrders:idConfirmResponseDto {
  id: string;
  status: string;
}

export interface GetApiOrdersRequestDto {
}

export interface GetApiOrdersResponseDto {
  id: string;
  status: string;
}
