const STALE_CODES: ReadonlySet<string> = new Set([
  'ASSET_ALREADY_ASSIGNED',
  'ASSET_NOT_ASSIGNABLE',
  'ASSET_NOT_ASSIGNED',
  'ASSET_RETIRED',
  'INVALID_ASSET_STATUS_TRANSITION',
  'FORBIDDEN',
  'RESOURCE_NOT_FOUND',
]);

/**
 * El equipo cambió mientras la persona decidía (lo asignaron, lo dieron de baja…): lo que veía ya no es
 * la realidad. Hay que mostrar el motivo y recargar, no seguir con el diálogo abierto.
 */
export function isStaleAssetError(code: string): boolean {
  return STALE_CODES.has(code);
}
