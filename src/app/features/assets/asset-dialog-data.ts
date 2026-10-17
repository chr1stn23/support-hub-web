import type { AssetDetail } from '@core/api/models';

/** Lo que reciben los diálogos de acciones. Su resultado: true = hay que recargar el equipo. */
export interface AssetDialogData {
  readonly asset: AssetDetail;
}

export interface AssetAssignDialogData extends AssetDialogData {
  readonly mode: 'assign' | 'transfer';
}

/** Sin `asset`, el formulario registra un equipo nuevo. Su resultado: el id del equipo creado, o true si hay que recargar. */
export interface AssetFormData {
  readonly asset?: AssetDetail;
}
