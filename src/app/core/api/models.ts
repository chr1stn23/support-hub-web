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
  assets?: DashboardAssetMetrics | null;
}

// Acciones sobre tickets
export interface UserLookup {
  id: string;
  fullName: string;
  email: string;
}

export interface ChangeStatusRequest {
  status: TicketStatus;
  note?: string | null;
}

/** Solo viajan los campos que cambiaron; `version` es la que se leyó, para detectar ediciones simultáneas. */
export interface UpdateTicketRequest {
  version: number;
  title?: string;
  description?: string;
  categoryId?: string;
  priority?: TicketPriority;
}

export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: UserSummary;
  createdAt: string;
  /** Lo decide el servidor: quien lo subió, el agente asignado o un administrador, con el ticket abierto. */
  canDelete: boolean;
}

export interface AssetType {
  id: string;
  name: string;
}

export interface DashboardAssetMetrics {
  total: number;
  /** Puede faltar un estado sin equipos: quien lo lea debe tratarlo como 0. */
  byStatus: Partial<Record<AssetStatus, number>>;
  byType: { type: string; count: number }[];
}

// Detalle y acciones de equipos
export interface AssetActions {
  edit: boolean;
  assign: boolean;
  transfer: boolean;
  returnAsset: boolean;
  changeStatus: AssetStatus[];
}

export interface AssetDetail {
  id: string;
  assetTag: string;
  type: AssetType;
  brand: string;
  model: string;
  serialNumber: string | null;
  status: AssetStatus;
  location: string | null;
  assignedTo: UserSummary | null;
  assignedSince: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  actions: AssetActions;
}

export interface AssetAssignment {
  id: string;
  user: UserSummary;
  assignedBy: UserSummary;
  assignedAt: string;
  returnedAt: string | null;
  notes: string | null;
}

export interface CreateAssetRequest {
  assetTypeId: string;
  brand: string;
  model: string;
  serialNumber?: string | null;
  location?: string | null;
}

export interface UpdateAssetRequest {
  version: number;
  assetTypeId?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
}

export interface AssignAssetRequest {
  userId: string;
  notes?: string | null;
}

// Administración de usuarios

export interface UserAdmin {
  id: string;
  email: string;
  fullName: string;
  active: boolean;
  roles: Role[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateUserRequest {
  email: string;
  fullName: string;
  password: string;
  roles: Role[];
}

export interface UpdateUserRequest {
  version: number;
  fullName?: string;
  email?: string;
}

// Auditoria

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'ACCESS_DENIED'
  | 'REFRESH_REUSE_DETECTED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_ROLES_CHANGED'
  | 'USER_DEACTIVATED'
  | 'USER_ACTIVATED'
  | 'TICKET_CREATED'
  | 'TICKET_UPDATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_COMMENT_ADDED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_DELETED'
  | 'ASSET_CREATED'
  | 'ASSET_UPDATED'
  | 'ASSET_ASSIGNED'
  | 'ASSET_TRANSFERRED'
  | 'ASSET_RETURNED'
  | 'ASSET_STATUS_CHANGED';

export type AuditEntityType = 'TICKET' | 'ASSET' | 'USER' | 'SECURITY';
export type AuditResult = 'SUCCESS' | 'FAILURE';

export interface AuditLogEntry {
  id: string;
  actor: UserSummary | null;
  action: string;
  entityType: string;
  entityId: string | null;
  result: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// Resumen completo

export interface DashboardPeriod {
  from: string;
  to: string;
  days: number;
}

export interface DayPoint {
  day: string;
  created: number;
  resolved: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface ActivityItem {
  at: string;
  eventType: string;
  actor: UserSummary | null;
  ticketId: string;
  ticketCode: string;
  ticketTitle: string;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
}

export interface DashboardReport extends DashboardSummary {
  period: DashboardPeriod;
  tickets: DashboardSummary['tickets'] & {
    createdInPeriod: number;
    resolvedInPeriod: number;
    /** null si todavía no hay tickets resueltos. */
    avgResolutionHours: number | null;
    byCategory: CategoryCount[];
    trend: DayPoint[];
  };
  recentActivity: ActivityItem[];
  generatedAt: string;
}

// Notificaciones
export type NotificationType =
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_STATUS_CHANGED'
  | 'TICKET_COMMENT_ADDED'
  | 'ASSET_ASSIGNED'
  | 'ASSET_TRANSFERRED'
  | 'ASSET_RETURNED';

export interface AppNotification {
  id: string;
  /** Un texto, no el tipo cerrado: si el backend añade tipos, la pantalla no debe fallar. */
  type: NotificationType | string;
  /** Ya viene en español. */
  message: string;
  ticketId: string | null;
  assetId: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}
