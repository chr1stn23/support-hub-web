import {
  AssetFormModel,
  buildAssetCreate,
  buildAssetUpdate,
  EMPTY_ASSET_FORM,
  formModelOf,
  rebaseAsset,
} from '@features/assets/asset-edit-changes';
import { assetDetail } from '@features/assets/asset-fixtures';

const baseline: AssetFormModel = {
  assetTypeId: 'type-1',
  brand: 'Dell',
  model: 'Latitude 5440',
  serialNumber: 'SN-123',
  location: 'Piso 2',
};

describe('formModelOf', () => {
  it('takes the editable fields, with empty text for what is missing', () => {
    expect(formModelOf(assetDetail())).toEqual(baseline);
    expect(formModelOf(assetDetail({ serialNumber: null, location: null }))).toMatchObject({
      serialNumber: '',
      location: '',
    });
  });
});

describe('buildAssetUpdate', () => {
  it('is null when nothing changed, and when the only change is spaces around the text', () => {
    expect(buildAssetUpdate({ ...baseline }, baseline, 4)).toBeNull();
    expect(buildAssetUpdate({ ...baseline, brand: '  Dell  ' }, baseline, 4)).toBeNull();
  });

  it('sends only what changed, trimmed, with the version that was read', () => {
    expect(
      buildAssetUpdate({ ...baseline, brand: '  Lenovo ', location: 'Almacén' }, baseline, 4),
    ).toEqual({
      version: 4,
      brand: 'Lenovo',
      location: 'Almacén',
    });
  });

  it('sends the new type', () => {
    expect(buildAssetUpdate({ ...baseline, assetTypeId: 'type-2' }, baseline, 0)).toEqual({
      version: 0,
      assetTypeId: 'type-2',
    });
  });

  it('sends an empty string to erase the serial number or the location (that is how the backend clears them)', () => {
    expect(
      buildAssetUpdate({ ...baseline, serialNumber: '   ', location: '' }, baseline, 4),
    ).toEqual({
      version: 4,
      serialNumber: '',
      location: '',
    });
  });

  it('does not send an erase for something that was already empty', () => {
    const empty = { ...baseline, serialNumber: '' };
    expect(buildAssetUpdate({ ...empty }, empty, 4)).toBeNull();
  });
});

describe('buildAssetCreate', () => {
  it('trims the texts and sends null for an empty serial number or location', () => {
    expect(
      buildAssetCreate({
        assetTypeId: 'type-1',
        brand: ' Dell ',
        model: ' XPS ',
        serialNumber: '  ',
        location: '',
      }),
    ).toEqual({
      assetTypeId: 'type-1',
      brand: 'Dell',
      model: 'XPS',
      serialNumber: null,
      location: null,
    });
  });

  it('keeps a serial number and a location when they are there', () => {
    expect(
      buildAssetCreate({
        ...EMPTY_ASSET_FORM,
        assetTypeId: 't',
        brand: 'a',
        model: 'b',
        serialNumber: ' S1 ',
        location: ' Piso 1 ',
      }),
    ).toMatchObject({
      serialNumber: 'S1',
      location: 'Piso 1',
    });
  });
});

describe('rebaseAsset', () => {
  const fresh: AssetFormModel = { ...baseline, location: 'Bodega norte', serialNumber: 'SN-999' };

  it('keeps what the person changed and takes the rest from the server', () => {
    const result = rebaseAsset({ ...baseline, brand: 'Mi marca' }, baseline, fresh);
    expect(result.model).toEqual({ ...fresh, brand: 'Mi marca' });
  });

  it("makes the server version the new baseline, so saving only sends the person's own change", () => {
    const result = rebaseAsset({ ...baseline, brand: 'Mi marca' }, baseline, fresh);
    expect(result.baseline).toEqual(fresh);
    expect(buildAssetUpdate(result.model, result.baseline, 5)).toEqual({
      version: 5,
      brand: 'Mi marca',
    });
  });

  it('with no changes of its own, simply adopts the server version', () => {
    expect(rebaseAsset({ ...baseline }, baseline, fresh).model).toEqual(fresh);
  });
});
