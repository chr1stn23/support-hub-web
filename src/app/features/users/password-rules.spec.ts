import { validatePassword } from './password-rules';

describe('validatePassword', () => {
  it.each(['Demo1234!', 'abcdefg1', 'A1' + 'x'.repeat(70), 'Contraseña1'])(
    'accepts %s',
    (password) => {
      expect(validatePassword(password)).toBeNull();
    },
  );

  it('asks for at least 8 characters', () => {
    expect(validatePassword('Ab1')).toBe('La contraseña debe tener al menos 8 caracteres.');
    expect(validatePassword('Abcdef1')).not.toBeNull();
    expect(validatePassword('Abcdefg1')).toBeNull();
  });

  it('asks for a letter and a digit', () => {
    expect(validatePassword('12345678')).toBe('Debe incluir al menos una letra y un número.');
    expect(validatePassword('abcdefgh')).toBe('Debe incluir al menos una letra y un número.');
  });

  it('counts BYTES, not characters, against the limit of 72', () => {
    expect(validatePassword('a1' + 'ñ'.repeat(36))).toContain('72 bytes'); // 38 caracteres, pero 74 bytes
    expect(validatePassword('a1' + 'ñ'.repeat(35))).toBeNull(); // 37 caracteres, 72 bytes justos
  });
});
