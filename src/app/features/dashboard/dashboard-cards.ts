import type { DashboardReport } from '@core/api/models';
import { formatCount, formatDuration } from './dashboard-format';

export interface StatCard {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly hint: string | null;
  /** Parámetros de /tickets al hacer clic, o null si la tarjeta no lleva a ningún sitio. */
  readonly link: { readonly params: Record<string, string> } | null;
  /** Algo que conviene mirar: sin asignar o de prioridad alta. */
  readonly attention: boolean;
}

const plural = (n: number, one: string, many: string): string =>
  `${formatCount(n)} ${n === 1 ? one : many}`;

/** Las cifras principales según lo que el servidor entregó para el rol de quien mira. */
export function buildCards(report: DashboardReport): StatCard[] {
  const { tickets, mine, period } = report;
  const days = `los últimos ${period.days} días`;
  const staff = report.scope === 'ALL';

  const resolved: StatCard = {
    id: 'resolved',
    label: 'Resueltos',
    value: formatCount(tickets.resolvedInPeriod),
    hint: `En ${days}`,
    link: { params: { vista: 'resueltos' } },
    attention: false,
  };
  const average: StatCard = {
    id: 'average',
    label: 'Tiempo medio de resolución',
    value: formatDuration(tickets.avgResolutionHours),
    hint:
      tickets.avgResolutionHours === null
        ? 'Aún no hay tickets resueltos'
        : 'Desde que se crea hasta que se resuelve',
    link: null,
    attention: false,
  };

  if (!staff) {
    return [
      {
        id: 'open',
        label: 'Mis tickets abiertos',
        value: formatCount(tickets.open),
        hint: `${plural(tickets.createdInPeriod, 'creado', 'creados')} en ${days}`,
        link: { params: {} },
        attention: false,
      },
      {
        id: 'unassigned',
        label: 'Esperando a un agente',
        value: formatCount(tickets.unassigned),
        hint: 'Todavía sin nadie a cargo',
        link: { params: { vista: 'sin-asignar' } },
        attention: false,
      },
      resolved,
      average,
    ];
  }

  const cards: StatCard[] = [
    {
      id: 'open',
      label: 'Abiertos',
      value: formatCount(tickets.open),
      hint: `${plural(tickets.createdInPeriod, 'creado', 'creados')} en ${days}`,
      link: { params: {} },
      attention: false,
    },
    {
      id: 'unassigned',
      label: 'Sin asignar',
      value: formatCount(tickets.unassigned),
      hint: 'Esperan a que alguien los tome',
      link: { params: { vista: 'sin-asignar' } },
      attention: tickets.unassigned > 0,
    },
    {
      id: 'high',
      label: 'Prioridad alta',
      value: formatCount(tickets.highPriorityOpen),
      hint: 'Abiertos, altos y críticos',
      link: { params: { vista: 'prioridad-alta' } },
      attention: tickets.highPriorityOpen > 0,
    },
  ];
  if (mine) {
    cards.push({
      id: 'mine',
      label: 'Asignados a mí',
      value: formatCount(mine.assignedOpen),
      hint: `${plural(mine.resolvedInPeriod, 'resuelto', 'resueltos')} por ti en ${days}`,
      link: { params: { vista: 'mios' } },
      attention: false,
    });
  }
  return [...cards, resolved, average];
}
