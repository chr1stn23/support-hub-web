import { TicketStatus } from '@core/api/models';

export interface StatusActionText {
  readonly title: string;
  readonly description: string;
  /** No se puede deshacer: la confirmación va en rojo. */
  readonly destructive: boolean;
}

const FINAL = 'Es definitivo: el ticket ya no se podrá editar ni comentar.';

/** Cómo se presenta cada transición. `from` importa porque "volver a En curso" significa cosas distintas. */
export function statusAction(from: TicketStatus, to: TicketStatus): StatusActionText {
  switch (to) {
    case 'WAITING':
      return {
        title: 'Poner en espera',
        description: 'Queda a la espera de algo, por ejemplo un repuesto o una respuesta.',
        destructive: false,
      };
    case 'RESOLVED':
      return {
        title: 'Marcar como resuelto',
        description:
          'Quien lo solicitó podrá confirmarlo y cerrarlo, o reabrirlo si sigue fallando.',
        destructive: false,
      };
    case 'CLOSED':
      return { title: 'Cerrar ticket', description: FINAL, destructive: true };
    case 'CANCELLED':
      return { title: 'Cancelar ticket', description: FINAL, destructive: true };
    case 'IN_PROGRESS':
      return from === 'RESOLVED'
        ? {
            title: 'Reabrir ticket',
            description: 'Vuelve a estar en curso. Explica por qué sigue sin resolverse.',
            destructive: false,
          }
        : {
            title: 'Reanudar el trabajo',
            description: 'El ticket vuelve a estar en curso.',
            destructive: false,
          };
    case 'OPEN':
      return {
        title: 'Dejar sin asignar',
        description: 'El ticket vuelve a la cola.',
        destructive: false,
      };
  }
}
