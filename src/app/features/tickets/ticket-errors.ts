const STALE_CODES: ReadonlySet<string> = new Set([
  'INVALID_STATUS_TRANSITION',
  'FORBIDDEN',
  'TICKET_LOCKED',
  'TICKET_NOT_ASSIGNABLE',
  'TICKET_ALREADY_ASSIGNED',
  'RESOURCE_NOT_FOUND',
]);

/**
 * El ticket cambió mientras la persona decidía (lo cerraron, lo tomó otra persona…): lo que veía ya no es
 * la realidad. No tiene sentido seguir con el diálogo abierto: hay que mostrar el motivo y recargar.
 */
export function isStaleTicketError(code: string): boolean {
  return STALE_CODES.has(code);
}
