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

export interface UnreadCountResponse {
  count: number;
}

// TICKETS
export interface CategoryResponse {
  id: string;
  name: string;
}

export interface AssetSummary {
  id: string;
  assetTag: string;
  brand: string | null;
  model: string | null;
}

/** Equipo tal como aparece en listados (GET /assets/mine y GET /assets). */
export interface AssetListItem {
  id: string;
  assetTag: string;
  type: string;
  brand: string | null;
  model: string | null;
  status: AssetStatus;
  location: string | null;
  assignedTo: UserSummary | null;
}

export interface TicketStatusOption {
  status: TicketStatus;
  /** Si es true, el cambio exige una nota (por ejemplo, al reabrir). */
  noteRequired: boolean;
}

/** Lo que QUIEN CONSULTA puede hacer sobre el ticket. Lo calcula el servidor: no se duplica en el cliente. */
export interface TicketActions {
  editContent: boolean;
  editTriage: boolean;
  comment: boolean;
  attach: boolean;
  assignToSelf: boolean;
  assignToOthers: boolean;
  changeStatus: TicketStatusOption[];
}

export interface TicketSummary {
  id: string;
  ticketCode: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  categoryName: string;
  requester: UserSummary;
  agent: UserSummary | null;
  createdAt: string;
  updatedAt: string;
  canAssignToSelf: boolean;
}

export interface Ticket {
  id: string;
  ticketCode: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: CategoryResponse;
  requester: UserSummary;
  agent: UserSummary | null;
  asset: AssetSummary | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  version: number;
  actions: TicketActions;
}

export interface TicketComment {
  id: string;
  author: UserSummary;
  body: string;
  createdAt: string;
}

export type TicketEventType = 'CREATED' | 'ASSIGNED' | 'STATUS_CHANGED' | 'DETAILS_UPDATED';

export interface TicketHistoryEvent {
  id: string;
  eventType: TicketEventType;
  actor: UserSummary;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  createdAt: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  categoryId: string;
  priority: TicketPriority;
  assetId?: string | null;
}

// DASHBOARD (Solo lo que usan las pestañas de la lista)
export interface DashboardSummary {
  scope: 'ALL' | 'OWN';
  tickets: {
    open: number;
    unassigned: number;
    highPriorityOpen: number;
    byStatus: Record<TicketStatus, number>;
  };
  mine: { assignedOpen: number; resolvedInPeriod: number } | null;
}
