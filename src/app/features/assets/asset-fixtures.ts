import { AssetDetail } from '@core/api/models';

export const assetDetail = (overrides: Partial<AssetDetail> = {}): AssetDetail => ({
  id: 'a-1',
  assetTag: 'AST-000045',
  type: { id: 'type-1', name: 'Laptop' },
  brand: 'Dell',
  model: 'Latitude 5440',
  serialNumber: 'SN-123',
  status: 'AVAILABLE',
  location: 'Piso 2',
  assignedTo: null,
  assignedSince: null,
  createdAt: '2026-10-01T15:00:00Z',
  updatedAt: '2026-10-08T15:00:00Z',
  version: 4,
  actions: {
    edit: true,
    assign: true,
    transfer: false,
    returnAsset: false,
    changeStatus: ['MAINTENANCE', 'RETIRED'],
  },
  ...overrides,
});

/** Un equipo asignado a Lucía, tal como lo ve quien lo gestiona. */
export const assignedAsset = (overrides: Partial<AssetDetail> = {}): AssetDetail =>
  assetDetail({
    status: 'ASSIGNED',
    assignedTo: { id: 'u-9', fullName: 'Lucía Usuaria' },
    assignedSince: '2026-10-05T15:00:00Z',
    actions: { edit: true, assign: false, transfer: true, returnAsset: true, changeStatus: [] },
    ...overrides,
  });

export const apiError = (status: number, code: string, fieldErrors: unknown[] = []) => ({
  timestamp: '',
  status,
  code,
  message: 'x',
  path: '',
  fieldErrors,
});

export const person = (id: string, fullName: string) => ({ id, fullName, email: `${id}@x.com` });

export const lookupPage = (...content: ReturnType<typeof person>[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
});
