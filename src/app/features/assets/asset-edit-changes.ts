import { AssetDetail, CreateAssetRequest, UpdateAssetRequest } from '@core/api/models';

export interface AssetFormModel {
  assetTypeId: string;
  brand: string;
  model: string;
  /** Vacío = sin número de serie. */
  serialNumber: string;
  location: string;
}

export const EMPTY_ASSET_FORM: AssetFormModel = {
  assetTypeId: '',
  brand: '',
  model: '',
  serialNumber: '',
  location: '',
};

export function formModelOf(asset: AssetDetail): AssetFormModel {
  return {
    assetTypeId: asset.type.id,
    brand: asset.brand,
    model: asset.model,
    serialNumber: asset.serialNumber ?? '',
    location: asset.location ?? '',
  };
}

export function buildAssetUpdate(
  model: AssetFormModel,
  baseline: AssetFormModel,
  version: number,
): UpdateAssetRequest | null {
  const update: UpdateAssetRequest = { version };
  let changed = false;

  if (model.assetTypeId !== baseline.assetTypeId) {
    update.assetTypeId = model.assetTypeId;
    changed = true;
  }
  for (const key of ['brand', 'model', 'serialNumber', 'location'] as const) {
    const value = model[key].trim();
    if (value !== baseline[key].trim()) {
      update[key] = value;
      changed = true;
    }
  }
  return changed ? update : null;
}

export function buildAssetCreate(model: AssetFormModel): CreateAssetRequest {
  return {
    assetTypeId: model.assetTypeId,
    brand: model.brand.trim(),
    model: model.model.trim(),
    serialNumber: model.serialNumber.trim() || null,
    location: model.location.trim() || null,
  };
}

/**
 * Alguien más editó el equipo mientras la persona escribía. Se conserva lo que ELLA cambió y el resto
 * se actualiza con lo nuevo; la línea base pasa a ser la versión del servidor.
 */
export function rebaseAsset(
  model: AssetFormModel,
  baseline: AssetFormModel,
  fresh: AssetFormModel,
): { model: AssetFormModel; baseline: AssetFormModel } {
  const merged: AssetFormModel = { ...fresh };
  for (const key of Object.keys(merged) as (keyof AssetFormModel)[]) {
    if (model[key] !== baseline[key]) {
      merged[key] = model[key];
    }
  }
  return { model: merged, baseline: fresh };
}
