import type { AssetStatus } from '@core/api/models';

export interface AssetStatusActionText {
  readonly title: string;
  readonly description: string;
  readonly destructive: boolean;
}

export function assetTitle(asset: {
  brand: string | null;
  model: string | null;
  type: string;
}): string {
  return [asset.brand, asset.model].filter(Boolean).join(' ') || asset.type;
}

/** Cómo se presenta cada cambio de estado que ofrece el servidor. */
export function assetStatusAction(to: AssetStatus): AssetStatusActionText {
  switch (to) {
    case 'MAINTENANCE':
      return {
        title: 'Enviar a mantenimiento',
        description: 'No se podrá asignar mientras esté en mantenimiento.',
        destructive: false,
      };
    case 'AVAILABLE':
      return {
        title: 'Marcar como disponible',
        description: 'Vuelve al inventario y se podrá asignar.',
        destructive: false,
      };
    case 'RETIRED':
      return {
        title: 'Dar de baja',
        description:
          'Es definitivo: el equipo ya no se podrá editar, asignar ni cambiar de estado.',
        destructive: true,
      };
    case 'ASSIGNED':
      return {
        title: 'Asignar',
        description: 'Se asigna con el botón «Asignar».',
        destructive: false,
      };
  }
}
