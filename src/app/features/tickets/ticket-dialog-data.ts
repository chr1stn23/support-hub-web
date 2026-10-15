import { Ticket } from '@core/api/models';

/** Lo que reciben los diálogos de acciones. El resultado de cada uno es un boolean: true = hay que recargar el ticket. */
export interface TicketDialogData {
  readonly ticket: Ticket;
}
