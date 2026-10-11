import { FieldErrorDetail, toApiError } from './api-error';

export const ERROR_MESSAGES: Record<string, string> = {
  // Transversales
  VALIDATION_ERROR: 'Revisa los campos marcados.',
  MALFORMED_REQUEST: 'No pudimos procesar la solicitud. Recarga la página e inténtalo otra vez.',
  UNAUTHORIZED: 'Tu sesión ya no es válida. Inicia sesión de nuevo.',
  FORBIDDEN: 'No tienes permiso para hacer esto.',
  RESOURCE_NOT_FOUND:
    'No encontramos lo que buscas. Puede que ya no exista o que no tengas acceso.',
  CONFLICT: 'La operación choca con datos existentes. Actualiza e inténtalo de nuevo.',
  CONCURRENT_MODIFICATION:
    'Alguien más modificó este registro mientras lo editabas. Recarga para ver los cambios.',
  INTERNAL_ERROR: 'Algo salió mal de nuestro lado. Inténtalo de nuevo en unos minutos.',

  // Sesión
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  TOO_MANY_ATTEMPTS:
    'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.',
  CSRF_TOKEN_INVALID: 'No pudimos verificar tu sesión. Recarga la página e inténtalo de nuevo.',
  CONCURRENT_REFRESH: 'Estamos renovando tu sesión. Inténtalo de nuevo en un momento.',

  // Usuarios
  INVALID_CURRENT_PASSWORD: 'La contraseña actual no es correcta.',
  EMAIL_ALREADY_USED: 'Ya existe un usuario con ese correo.',
  CANNOT_MODIFY_SELF: 'No puedes hacer esto sobre tu propia cuenta. Pídeselo a otro administrador.',
  LAST_ADMIN_REQUIRED: 'Debe quedar al menos un administrador activo.',
  USER_HAS_ACTIVE_ASSIGNMENTS:
    'Esta persona aún tiene equipos o tickets en curso. Devuélvelos o reasígnalos primero.',

  // Tickets
  INVALID_STATUS_TRANSITION: 'Ese cambio de estado no está permitido para este ticket.',
  TICKET_ALREADY_ASSIGNED: 'Este ticket ya está asignado a otro agente.',
  TICKET_NOT_ASSIGNABLE: 'Un ticket en este estado ya no se puede asignar.',
  TICKET_LOCKED: 'Este ticket está cerrado o cancelado y ya no admite cambios.',
  INVALID_ASSIGNEE:
    'La persona elegida no existe, está inactiva o no puede recibir esta asignación.',

  // Activos
  ASSET_ALREADY_ASSIGNED:
    'Este equipo ya está asignado. Actualiza la lista para ver quién lo tiene.',
  ASSET_NOT_ASSIGNABLE: 'Un equipo en mantenimiento o dado de baja no se puede asignar.',
  ASSET_NOT_ASSIGNED: 'Este equipo no está asignado a nadie.',
  ASSET_RETIRED: 'Este equipo está dado de baja y ya no se puede modificar.',
  INVALID_ASSET_STATUS_TRANSITION: 'Ese cambio de estado no es válido para este equipo.',
  DUPLICATE_SERIAL_NUMBER: 'Ya existe otro equipo con ese número de serie.',

  // Adjuntos
  UNSUPPORTED_FILE_TYPE: 'Tipo de archivo no permitido. Usa PNG, JPG, PDF o texto (.txt, .log).',
  FILE_TOO_LARGE: 'El archivo supera el tamaño máximo de 5 MB.',
  PAYLOAD_TOO_LARGE: 'El archivo supera el tamaño máximo de 5 MB.',
  ATTACHMENT_LIMIT_REACHED: 'Este ticket ya tiene el máximo de 10 adjuntos.',

  // Del cliente o del framework
  NETWORK_ERROR: 'No pudimos conectar con el servidor. Revisa tu conexión.',
  NOT_FOUND: 'No encontramos esa página o recurso.',
  UNKNOWN_ERROR: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
};

/** Avisos al volver a la pantalla de login. */
export const SESSION_NOTICES = {
  expired: 'Tu sesión expiró. Inicia sesión de nuevo.',
  unavailable: 'No pudimos verificar tu sesión porque el servidor no responde.',
} as const;

export type SessionNotice = keyof typeof SESSION_NOTICES;

function fallbackByStatus(status: number): string {
  if (status === 0) return ERROR_MESSAGES['NETWORK_ERROR'];
  if (status >= 500) return ERROR_MESSAGES['INTERNAL_ERROR'];
  return ERROR_MESSAGES['UNKNOWN_ERROR'];
}

/** El texto en español para mostrar a la persona, venga el error de donde venga. */
export function describeError(error: unknown): string {
  const apiError = toApiError(error);
  return ERROR_MESSAGES[apiError.code] ?? fallbackByStatus(apiError.status);
}

// ── Errores de formulario ──────────────────────────────────────────────

const FIELD_ERROR_BY_CONSTRAINT: Record<string, string> = {
  NotBlank: 'Este campo es obligatorio.',
  NotNull: 'Este campo es obligatorio.',
  NotEmpty: 'Selecciona al menos una opción.',
  Size: 'La longitud de este campo no es válida.',
  Email: 'Ingresa un correo electrónico válido.',
  Pattern: 'El formato no es válido.',
  Min: 'El valor es demasiado bajo.',
  Max: 'El valor es demasiado alto.',
  Positive: 'El valor debe ser mayor que cero.',
};

// Mensajes más precisos para campos concretos de formularios (clave: campo:restricción)
const FIELD_ERROR_OVERRIDES: Record<string, string> = {
  'title:Size': 'El asunto no puede superar los 200 caracteres.',
  'description:Size': 'La descripción debe tener entre 10 y 5000 caracteres.',
  'body:Size': 'El comentario no puede superar los 2000 caracteres.',
  'note:Size': 'La nota no puede superar los 500 caracteres.',
  'notes:Size': 'Las notas no pueden superar los 500 caracteres.',
  'fullName:Size': 'El nombre no puede superar los 150 caracteres.',
  'brand:Size': 'La marca no puede superar los 80 caracteres.',
  'model:Size': 'El modelo no puede superar los 120 caracteres.',
  'serialNumber:Size': 'El número de serie no puede superar los 120 caracteres.',
  'location:Size': 'La ubicación no puede superar los 120 caracteres.',
  'password:Size': 'Debe tener entre 8 y 72 caracteres.',
  'newPassword:Size': 'Debe tener entre 8 y 72 caracteres.',
  'password:Pattern': 'Debe incluir al menos una letra y un número.',
  'newPassword:Pattern': 'Debe incluir al menos una letra y un número.',
  'roles:NotEmpty': 'Selecciona al menos un rol.',
  'categoryId:NotNull': 'Selecciona una categoría.',
  'priority:NotNull': 'Selecciona una prioridad.',
  'assetTypeId:NotNull': 'Selecciona un tipo de equipo.',
  'userId:NotNull': 'Selecciona una persona.',
  'status:NotNull': 'Selecciona un estado.',
};

/** El mensaje en español de un error de campo. Nunca se muestra el texto en inglés del servidor. */
export function describeFieldError(detail: FieldErrorDetail): string {
  return (
    FIELD_ERROR_OVERRIDES[`${detail.field}:${detail.code}`] ??
    FIELD_ERROR_BY_CONSTRAINT[detail.code] ??
    'Revisa este campo.'
  );
}

/** Un mensaje por campo (el primero), listo para pintarlo junto a cada control del formulario. */
export function fieldErrorMessages(error: unknown): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const detail of toApiError(error).fieldErrors) {
    messages[detail.field] ??= describeFieldError(detail);
  }
  return messages;
}
