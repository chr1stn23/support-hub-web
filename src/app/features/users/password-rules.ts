export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_HINT = 'Entre 8 y 72 caracteres, con al menos una letra y un número.';

export function validatePassword(value: string): string | null {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (new TextEncoder().encode(value).length > PASSWORD_MAX_BYTES) {
    return `La contraseña es demasiado larga: el máximo son ${PASSWORD_MAX_BYTES} bytes (las letras con tilde cuentan doble).`;
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return 'Debe incluir al menos una letra y un número.';
  }
  return null;
}
