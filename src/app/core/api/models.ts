export type Role = 'ADMIN' | 'AGENT' | 'ASSET_MANAGER' | 'USER';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'RETIRED';

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UserSummary {
  id: string;
  fullName: string;
}

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  active: boolean;
  roles: Role[];
}

export interface LoginResponse {
  /** Solo llega en desarrollo. En producción el token esta en el cookie HttpOnly y NO viaja en el cuerpo. */
  accessToken?: string | null;
  tokenType: string;
  expiresIn: number;
  user: UserResponse;
}
