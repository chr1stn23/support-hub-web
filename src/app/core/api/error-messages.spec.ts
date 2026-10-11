import { HttpErrorResponse } from '@angular/common/http';
import { ERROR_MESSAGES, describeError, describeFieldError, fieldErrorMessages } from './error-messages';

const BACKEND_CODES = [
  'VALIDATION_ERROR',
  'MALFORMED_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'RESOURCE_NOT_FOUND',
  'CONFLICT',
  'INTERNAL_ERROR',
  'INVALID_CREDENTIALS',
  'TOO_MANY_ATTEMPTS',
  'CSRF_TOKEN_INVALID',
  'CONCURRENT_REFRESH',
  'INVALID_STATUS_TRANSITION',
  'TICKET_ALREADY_ASSIGNED',
  'TICKET_NOT_ASSIGNABLE',
  'TICKET_LOCKED',
  'INVALID_ASSIGNEE',
  'CONCURRENT_MODIFICATION',
  'ASSET_ALREADY_ASSIGNED',
  'ASSET_NOT_ASSIGNABLE',
  'ASSET_NOT_ASSIGNED',
  'ASSET_RETIRED',
  'INVALID_ASSET_STATUS_TRANSITION',
  'DUPLICATE_SERIAL_NUMBER',
  'EMAIL_ALREADY_USED',
  'CANNOT_MODIFY_SELF',
  'LAST_ADMIN_REQUIRED',
  'USER_HAS_ACTIVE_ASSIGNMENTS',
  'INVALID_CURRENT_PASSWORD',
  'UNSUPPORTED_FILE_TYPE',
  'FILE_TOO_LARGE',
  'ATTACHMENT_LIMIT_REACHED',
  'PAYLOAD_TOO_LARGE',
  'NOT_FOUND',
];

describe('error messages', () => {
  it.each(BACKEND_CODES)('has a Spanish message for %s', (code) => {
    expect(ERROR_MESSAGES[code]).toBeTruthy();
  });

  it('never leaks the backend message to the person', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: {
        timestamp: '',
        status: 409,
        code: 'ASSET_ALREADY_ASSIGNED',
        path: '',
        fieldErrors: [],
        message: 'The asset is already assigned to Lucía Usuaria.',
      },
    });
    expect(describeError(error)).toBe(ERROR_MESSAGES['ASSET_ALREADY_ASSIGNED']);
    expect(describeError(error)).not.toContain('Lucía');
  });

  it('falls back by status when the code is unknown', () => {
    const server = new HttpErrorResponse({ status: 500, error: 'oops' });
    const offline = new HttpErrorResponse({ status: 0 });
    expect(describeError(server)).toBe(ERROR_MESSAGES['INTERNAL_ERROR']);
    expect(describeError(offline)).toBe(ERROR_MESSAGES['NETWORK_ERROR']);
  });
});

describe('field errors', () => {
  it('translates by constraint', () => {
    expect(describeFieldError({ field: 'x', code: 'NotBlank', message: 'must not be blank' })).toBe(
      'Este campo es obligatorio.',
    );
    expect(describeFieldError({ field: 'x', code: 'Email', message: 'must be valid' })).toBe(
      'Ingresa un correo electrónico válido.',
    );
  });

  it('prefers the specific message of a known field', () => {
    expect(
      describeFieldError({ field: 'newPassword', code: 'Pattern', message: 'must match' }),
    ).toBe('Debe incluir al menos una letra y un número.');
    expect(describeFieldError({ field: 'description', code: 'Size', message: 'size' })).toContain(
      '10 y 5000',
    );
  });

  it('never shows the English text of the server', () => {
    const text = describeFieldError({
      field: 'zzz',
      code: 'SomethingNew',
      message: 'must be weird',
    });
    expect(text).toBe('Revisa este campo.');
    expect(text).not.toContain('weird');
  });

  it('keeps one message per field, the first one', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: {
        timestamp: '',
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed.',
        path: '',
        fieldErrors: [
          { field: 'title', code: 'NotBlank', message: 'must not be blank' },
          { field: 'title', code: 'Size', message: 'size must be between' },
          { field: 'categoryId', code: 'NotNull', message: 'must not be null' },
        ],
      },
    });
    expect(fieldErrorMessages(error)).toEqual({
      title: 'Este campo es obligatorio.',
      categoryId: 'Selecciona una categoría.',
    });
  });

  it('returns nothing for errors without field details', () => {
    expect(fieldErrorMessages(new Error('boom'))).toEqual({});
  });
});