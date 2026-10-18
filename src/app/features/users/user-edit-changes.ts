import type { UpdateUserRequest, UserAdmin } from '@core/api/models';

export interface UserFormModel {
  fullName: string;
  email: string;
}

export function userFormModelOf(user: Pick<UserAdmin, 'fullName' | 'email'>): UserFormModel {
  return { fullName: user.fullName, email: user.email };
}

/**
 * Solo lo que cambió, o null si no hay nada que guardar. El correo no distingue mayúsculas
 */
export function buildUserUpdate(
  model: UserFormModel,
  baseline: UserFormModel,
  version: number,
): UpdateUserRequest | null {
  const update: UpdateUserRequest = { version };
  let changed = false;

  const fullName = model.fullName.trim();
  if (fullName !== baseline.fullName.trim()) {
    update.fullName = fullName;
    changed = true;
  }
  const email = model.email.trim();
  if (email.toLowerCase() !== baseline.email.trim().toLowerCase()) {
    update.email = email;
    changed = true;
  }
  return changed ? update : null;
}

/** Alguien más editó a la persona mientras se escribía: se conserva lo que ELLA cambió y el resto se actualiza. */
export function rebaseUser(
  model: UserFormModel,
  baseline: UserFormModel,
  fresh: UserFormModel,
): { model: UserFormModel; baseline: UserFormModel } {
  const merged: UserFormModel = { ...fresh };
  for (const key of Object.keys(merged) as (keyof UserFormModel)[]) {
    if (model[key] !== baseline[key]) {
      merged[key] = model[key];
    }
  }
  return { model: merged, baseline: fresh };
}
