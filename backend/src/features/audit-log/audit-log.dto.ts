// AuditLog DTOs

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
