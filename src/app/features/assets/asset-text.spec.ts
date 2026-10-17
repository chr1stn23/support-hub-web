import { assetStatusAction, assetTitle } from '@features/assets/asset-text';
import { isStaleAssetError } from '@features/assets/asset-errors';

describe('assetTitle', () => {
  it('joins brand and model', () => {
    expect(assetTitle({ brand: 'Dell', model: 'Latitude 5440', type: 'Laptop' })).toBe(
      'Dell Latitude 5440',
    );
  });

  it('falls back to the type when both are missing', () => {
    expect(assetTitle({ brand: null, model: null, type: 'Laptop' })).toBe('Laptop');
  });

  it('works with only one of them', () => {
    expect(assetTitle({ brand: 'Dell', model: null, type: 'Laptop' })).toBe('Dell');
  });
});

describe('assetStatusAction', () => {
  it.each([
    ['MAINTENANCE', 'Enviar a mantenimiento'],
    ['AVAILABLE', 'Marcar como disponible'],
    ['RETIRED', 'Dar de baja'],
  ] as const)('%s is presented as "%s"', (status, title) => {
    expect(assetStatusAction(status).title).toBe(title);
  });

  it('only warns about irreversibility for retiring', () => {
    expect(assetStatusAction('RETIRED').destructive).toBe(true);
    expect(assetStatusAction('RETIRED').description).toContain('definitivo');
    expect(assetStatusAction('MAINTENANCE').destructive).toBe(false);
    expect(assetStatusAction('AVAILABLE').destructive).toBe(false);
  });
});

describe('isStaleAssetError', () => {
  it.each([
    'ASSET_ALREADY_ASSIGNED',
    'ASSET_NOT_ASSIGNABLE',
    'ASSET_NOT_ASSIGNED',
    'ASSET_RETIRED',
    'INVALID_ASSET_STATUS_TRANSITION',
    'FORBIDDEN',
    'RESOURCE_NOT_FOUND',
  ])('%s means the equipment changed under us', (code) => {
    expect(isStaleAssetError(code)).toBe(true);
  });

  it.each([
    'INVALID_ASSIGNEE',
    'DUPLICATE_SERIAL_NUMBER',
    'VALIDATION_ERROR',
    'INTERNAL_ERROR',
    'NETWORK_ERROR',
  ])('%s is something else: the dialog stays open', (code) => {
    expect(isStaleAssetError(code)).toBe(false);
  });
});
