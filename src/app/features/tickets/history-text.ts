import { TICKET_PRIORITY, TICKET_STATUS } from '@shared/domain';
import {
  TicketEventType,
  TicketHistoryEvent,
  TicketPriority,
  TicketStatus,
} from '@core/api/models';

export interface EventText {
  /** La frase principal: quién hizo qué. */
  readonly summary: string;
  /** Un dato adicional, como "«Media» → «Alta»". */
  readonly detail: string | null;
  /** La nota escrita por la persona (solo en cambios de estado). */
  readonly note: string | null;
}

// En DETAILS_UPDATED el backend manda en "note" el nombre del campo editado
const FIELD_LABEL: Record<string, string> = {
  title: 'el asunto',
  description: 'la descripción',
  priority: 'la prioridad',
  category: 'la categoría',
  asset: 'el equipo',
};

const statusLabel = (value: string | null): string =>
  value !== null && value in TICKET_STATUS
    ? TICKET_STATUS[value as TicketStatus].label
    : (value ?? '');

const priorityLabel = (value: string | null): string =>
  value !== null && value in TICKET_PRIORITY
    ? TICKET_PRIORITY[value as TicketPriority].label
    : (value ?? '');

const quoted = (value: string): string => `«${value}»`;

export function describeEvent(event: TicketHistoryEvent): EventText {
  const actor = event.actor.fullName;
  const type: TicketEventType = event.eventType;

  switch (type) {
    case 'CREATED':
      return { summary: `${actor} creó el ticket`, detail: null, note: null };

    case 'ASSIGNED':
      return {
        summary: describeAssignment(actor, event.oldValue, event.newValue),
        detail: null,
        note: null,
      };

    case 'STATUS_CHANGED': {
      const to = quoted(statusLabel(event.newValue));
      const summary = event.oldValue
        ? `${actor} cambió el estado de ${quoted(statusLabel(event.oldValue))} a ${to}`
        : `${actor} cambió el estado a ${to}`;
      return { summary, detail: null, note: event.note };
    }

    case 'DETAILS_UPDATED': {
      const field = event.note ?? '';
      const label = FIELD_LABEL[field] ?? 'los datos del ticket';
      const render = field === 'priority' ? priorityLabel : (value: string | null) => value ?? '';
      // La descripción puede ser larga: el backend registra el cambio, no los textos
      const detail =
        event.oldValue && event.newValue
          ? `${quoted(render(event.oldValue))} → ${quoted(render(event.newValue))}`
          : event.newValue
            ? `Ahora: ${quoted(render(event.newValue))}`
            : null;
      return { summary: `${actor} cambió ${label}`, detail, note: null };
    }
  }
}

function describeAssignment(actor: string, previous: string | null, next: string | null): string {
  const target = next ?? 'otra persona';
  if (!previous) {
    return actor === next ? `${actor} tomó el ticket` : `${actor} asignó el ticket a ${target}`;
  }
  return actor === next
    ? `${actor} se asignó el ticket (antes lo tenía ${previous})`
    : `${actor} reasignó el ticket de ${previous} a ${target}`;
}
