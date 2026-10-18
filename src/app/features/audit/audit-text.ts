import type { AuditAction, AuditLogEntry, Role } from '@core/api/models';
import { ASSET_STATUS, ROLE_LABEL, TICKET_PRIORITY, TICKET_STATUS } from '@shared/domain';
import { formatBytes } from '../tickets/attachment-rules';

type Meta = Record<string, unknown>;

export const AUDIT_ACTION_GROUPS: readonly {
  readonly label: string;
  readonly actions: readonly AuditAction[];
}[] = [
  {
    label: 'Sesión y seguridad',
    actions: [
      'LOGIN_SUCCESS',
      'LOGIN_FAILED',
      'LOGOUT',
      'ACCESS_DENIED',
      'REFRESH_REUSE_DETECTED',
      'PASSWORD_CHANGED',
    ],
  },
  {
    label: 'Usuarios',
    actions: [
      'USER_CREATED',
      'USER_UPDATED',
      'USER_ROLES_CHANGED',
      'USER_DEACTIVATED',
      'USER_ACTIVATED',
      'PASSWORD_RESET',
    ],
  },
  {
    label: 'Tickets',
    actions: [
      'TICKET_CREATED',
      'TICKET_UPDATED',
      'TICKET_ASSIGNED',
      'TICKET_STATUS_CHANGED',
      'TICKET_COMMENT_ADDED',
      'ATTACHMENT_ADDED',
      'ATTACHMENT_DELETED',
    ],
  },
  {
    label: 'Equipos',
    actions: [
      'ASSET_CREATED',
      'ASSET_UPDATED',
      'ASSET_ASSIGNED',
      'ASSET_TRANSFERRED',
      'ASSET_RETURNED',
      'ASSET_STATUS_CHANGED',
    ],
  },
];

export const AUDIT_ACTIONS: readonly AuditAction[] = AUDIT_ACTION_GROUPS.flatMap(
  (group) => group.actions,
);

/** El nombre corto de cada acción, para el filtro. */
export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  LOGIN_SUCCESS: 'Inicio de sesión',
  LOGIN_FAILED: 'Inicio de sesión fallido',
  LOGOUT: 'Cierre de sesión',
  ACCESS_DENIED: 'Acceso denegado',
  REFRESH_REUSE_DETECTED: 'Reuso de token detectado',
  PASSWORD_CHANGED: 'Cambio de contraseña',
  PASSWORD_RESET: 'Contraseña restablecida',
  USER_CREATED: 'Cuenta creada',
  USER_UPDATED: 'Cuenta editada',
  USER_ROLES_CHANGED: 'Roles cambiados',
  USER_DEACTIVATED: 'Cuenta desactivada',
  USER_ACTIVATED: 'Cuenta reactivada',
  TICKET_CREATED: 'Ticket creado',
  TICKET_UPDATED: 'Ticket editado',
  TICKET_ASSIGNED: 'Ticket asignado',
  TICKET_STATUS_CHANGED: 'Estado de ticket cambiado',
  TICKET_COMMENT_ADDED: 'Comentario agregado',
  ATTACHMENT_ADDED: 'Adjunto agregado',
  ATTACHMENT_DELETED: 'Adjunto eliminado',
  ASSET_CREATED: 'Equipo registrado',
  ASSET_UPDATED: 'Equipo editado',
  ASSET_ASSIGNED: 'Equipo asignado',
  ASSET_TRANSFERRED: 'Equipo transferido',
  ASSET_RETURNED: 'Equipo devuelto',
  ASSET_STATUS_CHANGED: 'Estado de equipo cambiado',
};

export interface AuditDetail {
  readonly label: string;
  readonly value: string;
}

export interface AuditTarget {
  readonly label: string;
  /** Ruta a la que lleva, o null si no hay a dónde ir. */
  readonly link: string[] | null;
}

export interface AuditEntryText {
  readonly summary: string;
  /** Un intento de acceso fallido o un token reusado: merece atención. */
  readonly alert: boolean;
  readonly target: AuditTarget | null;
  /** Lo que la frase no dice, con el nombre de cada dato. */
  readonly details: readonly AuditDetail[];
}

const KEY_LABEL: Record<string, string> = {
  ip: 'Dirección IP',
  email: 'Correo',
  reason: 'Motivo',
  method: 'Método',
  path: 'Ruta',
  familyId: 'Familia de sesión',
  ticketCode: 'Ticket',
  assetTag: 'Equipo',
  priority: 'Prioridad',
  category: 'Categoría',
  status: 'Estado',
  from: 'Antes',
  to: 'Después',
  fields: 'Campos',
  commentId: 'Comentario',
  attachmentId: 'Adjunto',
  contentType: 'Tipo de archivo',
  sizeBytes: 'Tamaño',
  type: 'Tipo',
  assignedTo: 'Asignado a',
  returnedBy: 'Devuelto por',
  roles: 'Roles',
};

const FIELD_LABEL: Record<string, string> = {
  title: 'asunto',
  description: 'descripción',
  priority: 'prioridad',
  category: 'categoría',
  asset: 'equipo',
  fullName: 'nombre',
  email: 'correo',
  brand: 'marca',
  model: 'modelo',
  serialNumber: 'número de serie',
  location: 'ubicación',
  type: 'tipo',
};

const REASON: Record<string, string> = {
  UNKNOWN_USER: 'correo desconocido',
  BAD_PASSWORD: 'contraseña incorrecta',
  INACTIVE_USER: 'cuenta inactiva',
};

const has = (map: object, key: string): boolean => Object.hasOwn(map, key);

const str = (meta: Meta, key: string): string | null => {
  const value = meta[key];
  return value === null || value === undefined || value === ''
    ? null
    : Array.isArray(value)
      ? value.join(', ')
      : String(value);
};

const list = (meta: Meta, key: string): string[] => {
  const value = meta[key];
  return Array.isArray(value) ? value.map(String) : [];
};

const statusLabel = (value: string): string =>
  has(TICKET_STATUS, value)
    ? TICKET_STATUS[value as keyof typeof TICKET_STATUS].label
    : has(ASSET_STATUS, value)
      ? ASSET_STATUS[value as keyof typeof ASSET_STATUS].label
      : value;

const roleName = (value: string): string =>
  has(ROLE_LABEL, value) ? ROLE_LABEL[value as Role] : value;
const roleList = (values: readonly string[]): string => values.map(roleName).join(', ');
const fieldList = (values: readonly string[]): string =>
  values.map((v) => (has(FIELD_LABEL, v) ? FIELD_LABEL[v] : v)).join(', ');

export function formatMetaValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length === 0 ? '—' : value.map(formatMetaValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function detailValue(key: string, value: unknown): string {
  const text = typeof value === 'string' ? value : null;
  switch (key) {
    case 'sizeBytes':
      return typeof value === 'number' ? formatBytes(value) : formatMetaValue(value);
    case 'status':
    case 'from':
    case 'to':
      return text !== null ? statusLabel(text) : formatMetaValue(value);
    case 'priority':
      return text !== null && has(TICKET_PRIORITY, text)
        ? TICKET_PRIORITY[text as keyof typeof TICKET_PRIORITY].label
        : formatMetaValue(value);
    case 'reason':
      return text !== null && has(REASON, text) ? REASON[text] : formatMetaValue(value);
    case 'roles':
      return Array.isArray(value) ? roleList(value.map(String)) : formatMetaValue(value);
    case 'fields':
      return Array.isArray(value) ? fieldList(value.map(String)) : formatMetaValue(value);
    default:
      return formatMetaValue(value);
  }
}

interface Handled {
  readonly summary: string;
  /** Las claves que la frase ya dice: no se repiten en los detalles. */
  readonly used: readonly string[];
  readonly alert?: boolean;
}

function summarize(action: string, meta: Meta): Handled {
  const ticket = str(meta, 'ticketCode') ? `ticket ${str(meta, 'ticketCode')}` : 'ticket';
  const asset = str(meta, 'assetTag') ? `equipo ${str(meta, 'assetTag')}` : 'equipo';
  const email = str(meta, 'email') ?? 'una persona';
  const fields = list(meta, 'fields');
  const fieldsNote = fields.length > 0 ? ` (${fieldList(fields)})` : '';
  const from = str(meta, 'from');
  const to = str(meta, 'to');
  const change = (what: string, used: string[]): Handled => ({
    summary: from
      ? `Cambió el estado del ${what} de «${statusLabel(from)}» a «${statusLabel(to ?? '')}»`
      : `Cambió el estado del ${what} a «${statusLabel(to ?? '')}»`,
    used,
  });

  switch (action) {
    case 'LOGIN_SUCCESS':
      return { summary: 'Inició sesión', used: [] };
    case 'LOGIN_FAILED': {
      const reason = str(meta, 'reason');
      const why = reason ? ` (${has(REASON, reason) ? REASON[reason] : reason})` : '';
      const who = str(meta, 'email') ? ` con ${str(meta, 'email')}` : '';
      return {
        summary: `Intento de inicio de sesión fallido${why}${who}`,
        used: ['reason', 'email'],
        alert: true,
      };
    }
    case 'LOGOUT':
      return { summary: 'Cerró sesión', used: [] };
    case 'ACCESS_DENIED': {
      const request = [str(meta, 'method'), str(meta, 'path')].filter(Boolean).join(' ');
      return {
        summary: request ? `Acceso denegado: ${request}` : 'Acceso denegado',
        used: ['method', 'path'],
        alert: true,
      };
    }
    case 'REFRESH_REUSE_DETECTED':
      return {
        summary:
          'Se detectó el reuso de un token de sesión; se cerraron todas las sesiones de la cuenta',
        used: [],
        alert: true,
      };
    case 'PASSWORD_CHANGED':
      return { summary: 'Cambió su contraseña', used: [] };
    case 'PASSWORD_RESET':
      return { summary: `Restableció la contraseña de ${email}`, used: ['email'] };
    case 'USER_CREATED': {
      const roles = list(meta, 'roles');
      return {
        summary: `Creó la cuenta de ${email}${roles.length > 0 ? ` con ${roleList(roles)}` : ''}`,
        used: ['email', 'roles'],
      };
    }
    case 'USER_UPDATED':
      return { summary: `Editó los datos de la cuenta${fieldsNote}`, used: ['fields'] };
    case 'USER_ROLES_CHANGED':
      return {
        summary: `Cambió los roles de ${email}: ${roleList(list(meta, 'from'))} → ${roleList(list(meta, 'to'))}`,
        used: ['email', 'from', 'to'],
      };
    case 'USER_DEACTIVATED':
      return { summary: `Desactivó la cuenta de ${email}`, used: ['email'] };
    case 'USER_ACTIVATED':
      return { summary: `Reactivó la cuenta de ${email}`, used: ['email'] };
    case 'TICKET_CREATED':
      return { summary: `Creó el ${ticket}`, used: ['ticketCode'] };
    case 'TICKET_UPDATED':
      return { summary: `Editó el ${ticket}${fieldsNote}`, used: ['ticketCode', 'fields'] };
    case 'TICKET_ASSIGNED': {
      const started = str(meta, 'status');
      return {
        summary:
          `Asignó el ${ticket} a ${to ?? 'otra persona'}` +
          (from ? ` (antes: ${from})` : '') +
          (started ? `; pasó a «${statusLabel(started)}»` : ''),
        used: ['ticketCode', 'from', 'to', 'status'],
      };
    }
    case 'TICKET_STATUS_CHANGED':
      return change(ticket, ['ticketCode', 'from', 'to']);
    case 'TICKET_COMMENT_ADDED':
      return { summary: `Comentó en el ${ticket}`, used: ['ticketCode'] };
    case 'ATTACHMENT_ADDED':
      return { summary: `Adjuntó un archivo al ${ticket}`, used: ['ticketCode'] };
    case 'ATTACHMENT_DELETED':
      return { summary: `Eliminó un adjunto del ${ticket}`, used: ['ticketCode'] };
    case 'ASSET_CREATED': {
      const type = str(meta, 'type');
      return {
        summary: `Registró el ${asset}${type ? ` (${type})` : ''}`,
        used: ['assetTag', 'type'],
      };
    }
    case 'ASSET_UPDATED':
      return { summary: `Editó el ${asset}${fieldsNote}`, used: ['assetTag', 'fields'] };
    case 'ASSET_ASSIGNED':
      return {
        summary: `Asignó el ${asset} a ${str(meta, 'assignedTo') ?? 'una persona'}`,
        used: ['assetTag', 'assignedTo'],
      };
    case 'ASSET_TRANSFERRED':
      return {
        summary: `Transfirió el ${asset} de ${from ?? 'una persona'} a ${to ?? 'otra'}`,
        used: ['assetTag', 'from', 'to'],
      };
    case 'ASSET_RETURNED': {
      const by = str(meta, 'returnedBy');
      return {
        summary: `Registró la devolución del ${asset}${by ? ` por ${by}` : ''}`,
        used: ['assetTag', 'returnedBy'],
      };
    }
    case 'ASSET_STATUS_CHANGED':
      return change(asset, ['assetTag', 'from', 'to']);
    default:
      return { summary: `Acción ${action}`, used: [] };
  }
}

const TARGET_KEY: Record<string, string> = {
  TICKET: 'ticketCode',
  ASSET: 'assetTag',
  USER: 'email',
};

function targetOf(entry: AuditLogEntry, meta: Meta): AuditTarget | null {
  const id = entry.entityId;
  if (!id) return null;
  switch (entry.entityType) {
    case 'TICKET':
      return { label: str(meta, 'ticketCode') ?? 'Ticket', link: ['/tickets', id] };
    case 'ASSET':
      return { label: str(meta, 'assetTag') ?? 'Equipo', link: ['/activos', id] };
    case 'USER': {
      const email = str(meta, 'email');
      // Cuando alguien actúa sobre su propia cuenta (iniciar sesión, cerrarla), el "objeto" no añade nada
      return email
        ? { label: email, link: ['/usuarios', id] }
        : id !== entry.actor?.id
          ? { label: 'Usuario', link: ['/usuarios', id] }
          : null;
    }
    default:
      return null;
  }
}

export function describeAudit(entry: AuditLogEntry): AuditEntryText {
  const meta: Meta = entry.metadata ?? {};
  const handled = summarize(entry.action, meta);
  const target = targetOf(entry, meta);

  const used = new Set(handled.used);
  if (target && has(TARGET_KEY, entry.entityType)) {
    used.add(TARGET_KEY[entry.entityType]);
  }

  const details = Object.entries(meta)
    .filter(
      ([key, value]) => !used.has(key) && value !== null && value !== undefined && value !== '',
    )
    .map(([key, value]) => ({
      label: has(KEY_LABEL, key) ? KEY_LABEL[key] : key,
      value: detailValue(key, value),
    }));

  return { summary: handled.summary, alert: handled.alert ?? false, target, details };
}
