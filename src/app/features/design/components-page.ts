import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TicketPriority, TicketStatus } from '@core/api/models';
import {
  ASSET_STATUS_ORDER,
  AssetStatusChip,
  PRIORITY_ORDER,
  PriorityBadge,
  TICKET_STATUS_ORDER,
  TicketStatusChip,
} from '@shared/domain';
import {
  Avatar,
  Button,
  ButtonSize,
  ButtonVariant,
  Chip,
  Control,
  DialogService,
  EmptyState,
  ErrorState,
  Field,
  Icon,
  IconName,
  ICONS,
  Pagination,
  Skeleton,
  SortHeader,
  SortState,
  Spinner,
  ToastService,
  Tone,
} from '@shared/ui';

interface DemoRow {
  readonly ticketCode: string;
  readonly title: string;
  readonly status: TicketStatus;
  readonly priority: TicketPriority;
  readonly agent: string | null;
  /** Minutos desde que se creó. */
  readonly age: number;
}

@Component({
  selector: 'app-components-page',
  imports: [
    Icon,
    Button,
    Field,
    Control,
    Chip,
    Avatar,
    TicketStatusChip,
    AssetStatusChip,
    PriorityBadge,
    EmptyState,
    ErrorState,
    Skeleton,
    Spinner,
    Pagination,
    SortHeader,
  ],
  templateUrl: './components-page.html',
  styleUrl: './components-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponentsPage {
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(DialogService);

  protected readonly iconNames = Object.keys(ICONS) as IconName[];
  protected readonly variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
  protected readonly sizes: ButtonSize[] = ['sm', 'md', 'lg'];
  protected readonly tones: Tone[] = [
    'neutral',
    'neutral-soft',
    'accent',
    'warning',
    'success',
    'danger',
  ];
  protected readonly ticketStatuses = TICKET_STATUS_ORDER;
  protected readonly assetStatuses = ASSET_STATUS_ORDER;
  protected readonly priorities = PRIORITY_ORDER;
  protected readonly names = [
    'Lucía Usuaria',
    'Carlos Agente',
    'Elena Agente',
    'Ana Admin',
    'Mario Activos',
    'Beto',
  ];

  protected readonly saving = signal(false);
  protected readonly checked = signal(true);

  // Estados de error de ejemplo
  protected readonly serverError = {
    timestamp: '',
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'detalle interno',
    path: '',
    fieldErrors: [],
  };
  protected readonly networkError = {
    timestamp: '',
    status: 0,
    code: 'NETWORK_ERROR',
    message: '',
    path: '',
    fieldErrors: [],
  };

  // Tabla, ordenación y paginación de ejemplo
  private readonly rows: readonly DemoRow[] = [
    {
      ticketCode: 'TCK-000142',
      title: 'Laptop no enciende',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      agent: 'Carlos Agente',
      age: 12,
    },
    {
      ticketCode: 'TCK-000141',
      title: 'VPN se desconecta cada pocos minutos',
      status: 'OPEN',
      priority: 'MEDIUM',
      agent: null,
      age: 45,
    },
    {
      ticketCode: 'TCK-000139',
      title: 'Acceso a la carpeta de Finanzas',
      status: 'WAITING',
      priority: 'LOW',
      agent: 'Elena Agente',
      age: 180,
    },
    {
      ticketCode: 'TCK-000137',
      title: 'Pantalla parpadea en la sala 3',
      status: 'RESOLVED',
      priority: 'MEDIUM',
      agent: 'Carlos Agente',
      age: 1440,
    },
    {
      ticketCode: 'TCK-000134',
      title: 'Impresora del piso 2 sin tóner',
      status: 'CLOSED',
      priority: 'LOW',
      agent: 'Elena Agente',
      age: 4320,
    },
    {
      ticketCode: 'TCK-000130',
      title: 'Servidor de correo caído',
      status: 'CANCELLED',
      priority: 'CRITICAL',
      agent: null,
      age: 7200,
    },
  ];

  protected readonly sort = signal<SortState | null>({ property: 'age', direction: 'asc' });
  protected readonly page = signal(0);
  protected readonly size = signal(20);
  protected readonly total = 135;

  protected readonly sortedRows = computed(() => {
    const sort = this.sort();
    if (!sort) return this.rows;
    const factor = sort.direction === 'asc' ? 1 : -1;
    const priorityRank = (p: TicketPriority) => PRIORITY_ORDER.indexOf(p);
    return [...this.rows].sort((a, b) => {
      switch (sort.property) {
        case 'priority':
          return (priorityRank(a.priority) - priorityRank(b.priority)) * factor;
        case 'age':
          return (a.age - b.age) * factor;
        case 'title':
          return a.title.localeCompare(b.title, 'es') * factor;
        default:
          return a.ticketCode.localeCompare(b.ticketCode, 'es') * factor;
      }
    });
  });

  protected formatAge(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return `${Math.round(minutes / 60)} h`;
    return `${Math.round(minutes / 1440)} d`;
  }

  protected changeSize(size: number): void {
    this.size.set(size);
    this.page.set(0);
  }

  protected simulateSave(): void {
    this.saving.set(true);
    setTimeout(() => this.saving.set(false), 1500);
  }

  protected showToast(kind: 'success' | 'error' | 'warning' | 'info'): void {
    const messages = {
      success: 'El ticket TCK-000142 se asignó a Carlos Agente.',
      error: 'Este equipo ya está asignado. Actualiza la lista para ver quién lo tiene.',
      warning: 'Tu sesión expirará en unos minutos.',
      info: 'Hay 3 notificaciones nuevas.',
    };
    this.toast[kind](messages[kind]);
  }

  protected async confirmPlain(): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Resolver ticket',
      message:
        '¿Pasar el ticket TCK-000142 a «Resuelto»? La persona que lo solicitó recibirá un aviso.',
      confirmLabel: 'Resolver',
    });
    this.toast.info(ok ? 'Confirmaste la acción.' : 'Cancelaste la acción.');
  }

  protected async confirmDestructive(): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Eliminar adjunto',
      message: 'Se borrará «captura.png» de este ticket y no se podrá recuperar.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    this.toast.info(ok ? 'Adjunto eliminado (de mentira).' : 'No se eliminó nada.');
  }
}
