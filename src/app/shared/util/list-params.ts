const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined): value is string {
  return value !== undefined && UUID.test(value);
}

/** Un entero mayor que 0, o el valor por defecto. Lo que llega de una URL no es de fiar. */
export function positiveInt(value: string | undefined, fallback: number): number {
  return value !== undefined && /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : fallback;
}
