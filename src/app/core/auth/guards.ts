import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { inject } from '@angular/core';
import { Role } from '@core/api/models';

/** Exige sesión; si no hay, va al login y recuerda a dónde quería ir. */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).isAuthenticated()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Para el login: quien ya tiene sesión no necesita verlo. */
export const guestGuard: CanActivateFn = () => {
  return inject(AuthService).isAuthenticated() ? inject(Router).createUrlTree(['/']) : true;
};

/** Exige alguno de los roles. La seguridad real es la del backend; esto evita pantallas inútiles. */
export function roleGuard(...allowed: Role[]): CanActivateFn {
  return () => {
    return inject(AuthService).hasAnyRole(allowed)
      ? true
      : inject(Router).createUrlTree(['/acceso-denegado']);
  };
}
