import {
  ACCEPT_ATTRIBUTE,
  extensionOf,
  fileKind,
  formatBytes,
  MAX_FILE_BYTES,
  validateBatch,
  validateFile,
} from '@features/tickets/attachment-rules';

const file = (name: string, size = 1000) => ({ name, size });

describe('extensionOf', () => {
  it.each([
    ['foto.PNG', 'png'],
    ['archivo.tar.gz', 'gz'],
    ['sin-extension', ''],
    ['termina-en-punto.', ''],
    ['.log', 'log'],
  ])('%s → "%s"', (name, expected) => {
    expect(extensionOf(name)).toBe(expected);
  });
});

describe('formatBytes', () => {
  it('uses bytes, KB and MB', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toMatch(/^1[.,]5 KB$/);
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });
});

describe('validateFile', () => {
  it.each(['a.png', 'a.JPG', 'a.jpeg', 'a.pdf', 'a.txt', 'error.log'])('accepts %s', (name) => {
    expect(validateFile(file(name), 5)).toBeNull();
  });

  it.each(['virus.exe', 'x.svg', 'page.html', 'archivo.zip', 'sin-extension', 'doc.docx'])(
    'rejects the format of %s',
    (name) => {
      expect(validateFile(file(name), 5)).toContain('no es un formato permitido');
    },
  );

  it('rejects an empty file', () => {
    expect(validateFile(file('a.txt', 0), 5)).toContain('está vacío');
  });

  it('accepts exactly 5 MB and rejects one byte more, saying how big it is', () => {
    expect(validateFile(file('a.pdf', MAX_FILE_BYTES), 5)).toBeNull();
    expect(validateFile(file('a.pdf', MAX_FILE_BYTES + 1), 5)).toContain('el máximo es 5 MB');
  });

  it('rejects when there is no room left', () => {
    expect(validateFile(file('a.png'), 0)).toContain('máximo de 10 adjuntos');
  });

  it('mentions the file name, so a batch is easy to read', () => {
    expect(validateFile(file('captura.exe'), 5)).toContain('«captura.exe»');
  });

  it('puts the format first, since it is the thing the person can fix', () => {
    expect(validateFile(file('x.exe', 0), 0)).toContain('formato');
  });
});

describe('validateBatch', () => {
  it('splits what is accepted from what is rejected', () => {
    const { accepted, rejected } = validateBatch([file('a.png'), file('b.exe'), file('c.txt')], 5);
    expect(accepted.map((f) => f.name)).toEqual(['a.png', 'c.txt']);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toContain('b.exe');
  });

  it('spends the remaining room as files are accepted', () => {
    const { accepted, rejected } = validateBatch([file('a.png'), file('b.png'), file('c.png')], 2);
    expect(accepted.map((f) => f.name)).toEqual(['a.png', 'b.png']);
    expect(rejected[0]).toContain('c.png');
    expect(rejected[0]).toContain('máximo de 10 adjuntos');
  });

  it('accepts nothing when there is no room', () => {
    expect(validateBatch([file('a.png')], 0).accepted).toEqual([]);
  });
});

describe('fileKind', () => {
  it.each([
    ['image/png', 'image', 'Imagen'],
    ['image/jpeg', 'image', 'Imagen'],
    ['application/pdf', 'file', 'PDF'],
    ['text/plain', 'file-text', 'Texto'],
    ['application/zip', 'file', 'Archivo'],
  ])('%s → %s / %s', (type, icon, label) => {
    expect(fileKind(type)).toEqual({ icon, label });
  });
});

describe('ACCEPT_ATTRIBUTE', () => {
  it('lists the allowed extensions for the browser file picker', () => {
    expect(ACCEPT_ATTRIBUTE).toBe('.png,.jpg,.jpeg,.pdf,.txt,.log');
  });
});
