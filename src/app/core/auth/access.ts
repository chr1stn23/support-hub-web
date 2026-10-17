import { Role } from '@core/api/models';

/** Los roles de cada sección restringida. Los usan el menú y las rutas: así no pueden desincronizarse. */
export const ACCESS = {
  /** Quienes ven el inventario de equipos. */
  inventory: ['ADMIN', 'ASSET_MANAGER', 'AGENT'],
  /** Quienes registran y gestionan equipos. */
  assetManagement: ['ADMIN', 'ASSET_MANAGER'],
  /** Administración de usuarios y auditoría */
  admin: ['ADMIN'],
} as const satisfies Record<string, readonly Role[]>;
