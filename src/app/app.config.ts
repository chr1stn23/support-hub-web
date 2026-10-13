import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { errorInterceptor } from '@core/auth/error.interceptor';
import { AuthService } from '@core/auth/auth.service';
import { sessionInterceptor } from '@core/auth/session.interceptor';
import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';
import { AppTitleStrategy } from '@core/title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Al volver atrás se recupera el desplazamiento; al ir a otra página, se empieza arriba
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideHttpClient(
      // El orden importa: errorInterceptor queda fuera y normaliza lo que sessionInterceptor deja pasar
      withInterceptors([errorInterceptor, sessionInterceptor]),
      // CSRF: Angular lee la cookie XSRF-TOKEN y repite su valor en X-XSRF-TOKEN en cada escritura a rutas relativas
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
    // El router no navega hasta saber si hay una sesión viva
    provideAppInitializer(() => inject(AuthService).restore()),
    {
      // Para que el overlay del cdk no ignore las configuracions del z-index
      provide: OVERLAY_DEFAULT_CONFIG,
      useValue: { usePopover: false },
    },
  ],
};
