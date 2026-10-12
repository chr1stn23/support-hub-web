import { initials, toneFor } from './initials';

describe('initials', () => {
  it.each([
    ['Lucía Usuaria', 'LU'],
    ['Carlos Agente', 'CA'],
    ['Ana', 'A'],
    ['  ana   maría  pérez ', 'AP'],
    ['élodie', 'É'],
    ['', ''],
    ['   ', ''],
  ])('%j → %j', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });

  it('copes with a missing name', () => {
    expect(initials(null)).toBe('');
    expect(initials(undefined)).toBe('');
  });
});

describe('toneFor', () => {
  it('always gives the same colour to the same person', () => {
    expect(toneFor('Lucía Usuaria')).toBe(toneFor('Lucía Usuaria'));
    expect(toneFor('  lucía usuaria ')).toBe(toneFor('Lucía Usuaria'));
  });

  it('never uses the red tone for a person', () => {
    const names = Array.from({ length: 200 }, (_, i) => `Persona ${i}`);
    expect(names.map(toneFor)).not.toContain('danger');
  });

  it('spreads people over several colours', () => {
    const names = Array.from({ length: 200 }, (_, i) => `Persona ${i}`);
    expect(new Set(names.map(toneFor)).size).toBeGreaterThan(1);
  });
});
