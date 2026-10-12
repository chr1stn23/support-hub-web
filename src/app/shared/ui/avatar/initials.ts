import { Tone } from '../chip/chip';

/** "Lucía Usuaria" → "LU"; "Ana" → "A"; vacío → "". */
export function initials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '';
  }
  const first = Array.from(words[0])[0];
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : '';
  return (first + last).toLocaleUpperCase('es');
}

// Sin el rojo: un avatar no debe parecer un error
const AVATAR_TONES: readonly Tone[] = ['accent', 'warning', 'success', 'neutral-soft'];

/** La misma persona siempre tiene el mismo color. */
export function toneFor(name: string | null | undefined): Tone {
  const text = (name ?? '').trim().toLowerCase();
  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}
