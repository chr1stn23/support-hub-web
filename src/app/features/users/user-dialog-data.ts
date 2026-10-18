import type { UserAdmin } from '@core/api/models';

/** Lo que reciben los diálogos de acciones. Su resultado: true = hay que recargar a la persona. */
export interface UserDialogData {
  readonly user: UserAdmin;
}

/** Sin `user`, el formulario crea una cuenta. Su resultado: el id de la cuenta creada, o true si hay que recargar. */
export interface UserFormData {
  readonly user?: UserAdmin;
}
