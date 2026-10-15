import { Ticket, TicketPriority, UpdateTicketRequest } from '@core/api/models';

export interface EditModel {
  title: string;
  description: string;
  categoryId: string;
  priority: TicketPriority;
}

export function modelOf(
  ticket: Pick<Ticket, 'title' | 'description' | 'category' | 'priority'>,
): EditModel {
  return {
    title: ticket.title,
    description: ticket.description,
    categoryId: ticket.category.id,
    priority: ticket.priority,
  };
}

/** Solo lo que cambió (sin espacios de más), o null si no hay nada que guardar. */
export function buildUpdate(
  model: EditModel,
  baseline: EditModel,
  version: number,
  includeTriage: boolean,
): UpdateTicketRequest | null {
  const update: UpdateTicketRequest = { version };
  let changed = false;

  const title = model.title.trim();
  if (title !== baseline.title.trim()) {
    update.title = title;
    changed = true;
  }
  const description = model.description.trim();
  if (description !== baseline.description.trim()) {
    update.description = description;
    changed = true;
  }
  if (includeTriage) {
    if (model.categoryId !== baseline.categoryId) {
      update.categoryId = model.categoryId;
      changed = true;
    }
    if (model.priority !== baseline.priority) {
      update.priority = model.priority;
      changed = true;
    }
  }
  return changed ? update : null;
}

/**
 * Alguien más editó el ticket mientras la persona escribía. Se conserva lo que ELLA cambió y el resto
 * se actualiza con lo nuevo; la línea base pasa a ser la versión del servidor.
 */
export function rebase(
  model: EditModel,
  baseline: EditModel,
  fresh: EditModel,
): { model: EditModel; baseline: EditModel } {
  const merged: EditModel = { ...fresh };
  for (const key of Object.keys(merged) as (keyof EditModel)[]) {
    if (model[key] !== baseline[key]) {
      (merged as Record<keyof EditModel, string>)[key] = model[key];
    }
  }
  return { model: merged, baseline: fresh };
}
