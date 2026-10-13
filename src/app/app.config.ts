import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { errorInterceptor } from '@core/auth/error.interceptor';
import { AuthService } from '@core/auth/auth.service';
import { sessionInterceptor } from '@core/auth/session.interceptor';
import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      // El orden importa: errorInterceptor queda fuera y normaliza lo que sessionInterceptor deja pasar
      withInterceptors([errorInterceptor, sessionInterceptor]),
      // CSRF: Angular lee la cookie XSRF-TOKEN y repite su valor en X-XSRF-TOKEN en cada escritura a rutas relativas
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
    // El router no navega hasta saber si hay una sesión viva
    provideAppInitializer(() => inject(AuthService).restore()),
    {
      provide: OVERLAY_DEFAULT_CONFIG,
      useValue: {
        usePopover: false
      }
    }
  ],
};
