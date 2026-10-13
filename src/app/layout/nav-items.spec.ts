import { Role } from "@core/api/models";
import { navGroupsFor, pathOf } from './nav-items';

const labels = (roles: Role[]) =>
  navGroupsFor(roles).flatMap((group) => group.items.map((item) => item.label));

describe('navGroupsFor', () => {
  it('USER: lo básico, sin inventario ni administración', () => {
    expect(labels(['USER'])).toEqual(['Resumen', 'Tickets', 'Mis equipos']);
  });

  it.each<Role>(['AGENT', 'ASSET_MANAGER'])('%s: además ve el inventario', (role) => {
    expect(labels([role])).toEqual(['Resumen', 'Tickets', 'Mis equipos', 'Inventario']);
  });

  it('ADMIN: ve todo', () => {
    expect(labels(['ADMIN'])).toEqual([
      'Resumen',
      'Tickets',
      'Mis equipos',
      'Inventario',
      'Usuarios',
      'Auditoría',
    ]);
  });

  it('combines the roles of a person', () => {
    const items = labels(['USER', 'ASSET_MANAGER']);
    expect(items).toContain('Inventario');
    expect(items).not.toContain('Usuarios');
  });

  it('drops groups with nothing to show', () => {
    expect(navGroupsFor(['USER']).map((group) => group.label)).toEqual(['Trabajo', 'Equipos']);
    expect(navGroupsFor(['ADMIN']).map((group) => group.label)).toEqual([
      'Trabajo',
      'Equipos',
      'Administración',
    ]);
  });

  it('never shows restricted items to someone without roles', () => {
    expect(labels([])).toEqual(['Resumen', 'Tickets', 'Mis equipos']);
  });
});

describe('pathOf', () => {
  it('ignores filters and anchors: they are not a page change', () => {
    expect(pathOf('/tickets?status=OPEN&page=2')).toBe('/tickets');
    expect(pathOf('/tickets#top')).toBe('/tickets');
    expect(pathOf('/tickets/abc')).toBe('/tickets/abc');
  });
});
