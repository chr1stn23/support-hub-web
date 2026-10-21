import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('App Routes', () => {
  it('defines the route configuration with login and shell', () => {
    const loginRoute = routes.find((r) => r.path === 'login');
    const shellRoute = routes.find((r) => r.path === '');

    expect(loginRoute).toBeDefined();
    expect(shellRoute).toBeDefined();
    expect(shellRoute?.children?.length).toBeGreaterThan(0);
  });

  it('resolves loadComponent callbacks for routes', async () => {
    // Recorre todas las rutas (raíz e hijas) que tengan carga diferida
    const allRoutes = [...routes, ...(routes.find((r) => r.path === '')?.children ?? [])];
    const lazyRoutes = allRoutes.filter((r) => typeof r.loadComponent === 'function');

    expect(lazyRoutes.length).toBeGreaterThan(0);

    for (const route of lazyRoutes) {
      const component = await (route.loadComponent as () => Promise<unknown>)();
      expect(component).toBeDefined();
    }
  });
});
