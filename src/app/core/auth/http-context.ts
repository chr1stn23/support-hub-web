import { HttpContextToken } from '@angular/common/http';

/**
 * Si es true, un 401 en esa petición no dispara ni la renovación ni el cierre de sesión.
 * Se usa en el login (un 401 allí es "credenciales incorrectas") y en las propias llamadas de sesión.
 */
export const SKIP_SESSION_EXPIRY = new HttpContextToken<boolean>(() => false);