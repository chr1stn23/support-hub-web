import type { AuditLogEntry } from '@core/api/models';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_GROUPS,
  AUDIT_ACTION_LABEL,
  describeAudit,
} from './audit-text';

const entry = (
  action: string,
  metadata: Record<string, unknown> | null,
  overrides: Partial<AuditLogEntry> = {},
): AuditLogEntry => ({
  id: 'e-1',
  actor: { id: 'u-1', fullName: 'Ana Admin' },
  action,
  entityType: 'TICKET',
  entityId: 't-1',
  result: 'SUCCESS',
  metadata,
  createdAt: '2026-10-08T15:00:00Z',
  ...overrides,
});

describe('describeAudit · una frase por acción', () => {
  const TICKET = { ticketCode: 'TCK-000142' };
  const ASSET = { assetTag: 'AST-000045' };

  it.each<[string, string, Record<string, unknown> | null, string]>([
    ['LOGIN_SUCCESS', 'USER', { ip: '1.2.3.4' }, 'Inició sesión'],
    ['LOGOUT', 'USER', null, 'Cerró sesión'],
    ['PASSWORD_CHANGED', 'USER', null, 'Cambió su contraseña'],
    ['PASSWORD_RESET', 'USER', { email: 'a@x.com' }, 'Restableció la contraseña de a@x.com'],
    [
      'USER_CREATED',
      'USER',
      { email: 'a@x.com', roles: ['AGENT', 'USER'] },
      'Creó la cuenta de a@x.com con Agente, Usuario',
    ],
    [
      'USER_UPDATED',
      'USER',
      { fields: ['fullName', 'email'] },
      'Editó los datos de la cuenta (nombre, correo)',
    ],
    [
      'USER_ROLES_CHANGED',
      'USER',
      { email: 'a@x.com', from: ['AGENT'], to: ['ADMIN', 'AGENT'] },
      'Cambió los roles de a@x.com: Agente → Administrador, Agente',
    ],
    ['USER_DEACTIVATED', 'USER', { email: 'a@x.com' }, 'Desactivó la cuenta de a@x.com'],
    ['USER_ACTIVATED', 'USER', { email: 'a@x.com' }, 'Reactivó la cuenta de a@x.com'],
    [
      'TICKET_CREATED',
      'TICKET',
      { ...TICKET, priority: 'HIGH', category: 'Hardware' },
      'Creó el ticket TCK-000142',
    ],
    [
      'TICKET_UPDATED',
      'TICKET',
      { ...TICKET, fields: ['priority', 'title'] },
      'Editó el ticket TCK-000142 (prioridad, asunto)',
    ],
    [
      'TICKET_ASSIGNED',
      'TICKET',
      { ...TICKET, from: null, to: 'Elena Agente', status: 'IN_PROGRESS' },
      'Asignó el ticket TCK-000142 a Elena Agente; pasó a «En curso»',
    ],
    [
      'TICKET_ASSIGNED',
      'TICKET',
      { ...TICKET, from: 'Carlos Agente', to: 'Elena Agente' },
      'Asignó el ticket TCK-000142 a Elena Agente (antes: Carlos Agente)',
    ],
    [
      'TICKET_STATUS_CHANGED',
      'TICKET',
      { ...TICKET, from: 'IN_PROGRESS', to: 'RESOLVED' },
      'Cambió el estado del ticket TCK-000142 de «En curso» a «Resuelto»',
    ],
    [
      'TICKET_COMMENT_ADDED',
      'TICKET',
      { ...TICKET, commentId: 'c-1' },
      'Comentó en el ticket TCK-000142',
    ],
    [
      'ATTACHMENT_ADDED',
      'TICKET',
      { ...TICKET, attachmentId: 'f-1' },
      'Adjuntó un archivo al ticket TCK-000142',
    ],
    [
      'ATTACHMENT_DELETED',
      'TICKET',
      { ...TICKET, attachmentId: 'f-1' },
      'Eliminó un adjunto del ticket TCK-000142',
    ],
    [
      'ASSET_CREATED',
      'ASSET',
      { ...ASSET, type: 'Laptop' },
      'Registró el equipo AST-000045 (Laptop)',
    ],
    [
      'ASSET_UPDATED',
      'ASSET',
      { ...ASSET, fields: ['location', 'serialNumber'] },
      'Editó el equipo AST-000045 (ubicación, número de serie)',
    ],
    [
      'ASSET_ASSIGNED',
      'ASSET',
      { ...ASSET, assignedTo: 'Lucía Usuaria' },
      'Asignó el equipo AST-000045 a Lucía Usuaria',
    ],
    [
      'ASSET_TRANSFERRED',
      'ASSET',
      { ...ASSET, from: 'Lucía Usuaria', to: 'Elena Agente' },
      'Transfirió el equipo AST-000045 de Lucía Usuaria a Elena Agente',
    ],
    [
      'ASSET_RETURNED',
      'ASSET',
      { ...ASSET, returnedBy: 'Lucía Usuaria' },
      'Registró la devolución del equipo AST-000045 por Lucía Usuaria',
    ],
    [
      'ASSET_STATUS_CHANGED',
      'ASSET',
      { ...ASSET, from: 'AVAILABLE', to: 'MAINTENANCE' },
      'Cambió el estado del equipo AST-000045 de «Disponible» a «En mantenimiento»',
    ],
  ])('%s → "%s"', (action, entityType, metadata, expected) => {
    expect(describeAudit(entry(action, metadata, { entityType })).summary).toBe(expected);
  });

  describe('seguridad', () => {
    it('a failed login says why and with which email, and is an alert', () => {
      const text = describeAudit(
        entry(
          'LOGIN_FAILED',
          { email: 'x@y.com', ip: '1.2.3.4', reason: 'BAD_PASSWORD' },
          { entityType: 'USER', entityId: null },
        ),
      );
      expect(text.summary).toBe(
        'Intento de inicio de sesión fallido (contraseña incorrecta) con x@y.com',
      );
      expect(text.alert).toBe(true);
      expect(text.details).toEqual([{ label: 'Dirección IP', value: '1.2.3.4' }]);
    });

    it.each([
      ['UNKNOWN_USER', 'correo desconocido'],
      ['BAD_PASSWORD', 'contraseña incorrecta'],
      ['INACTIVE_USER', 'cuenta inactiva'],
    ])('translates the reason %s', (reason, text) => {
      expect(
        describeAudit(entry('LOGIN_FAILED', { reason }, { entityType: 'USER' })).summary,
      ).toContain(text);
    });

    it('a denied access names the request, and has no object to go to', () => {
      const text = describeAudit(
        entry(
          'ACCESS_DENIED',
          { method: 'GET', path: '/api/v1/users' },
          { entityType: 'SECURITY', entityId: null },
        ),
      );
      expect(text.summary).toBe('Acceso denegado: GET /api/v1/users');
      expect(text.alert).toBe(true);
      expect(text.target).toBeNull();
    });

    it('a reused token is an alert, and keeps the session family as a detail', () => {
      const text = describeAudit(
        entry(
          'REFRESH_REUSE_DETECTED',
          { familyId: 'fam-1' },
          { entityType: 'USER', result: 'FAILURE' },
        ),
      );
      expect(text.summary).toContain('reuso de un token de sesión');
      expect(text.alert).toBe(true);
      expect(text.details).toEqual([{ label: 'Familia de sesión', value: 'fam-1' }]);
    });

    it('ordinary actions are not alerts', () => {
      expect(describeAudit(entry('LOGIN_SUCCESS', null, { entityType: 'USER' })).alert).toBe(false);
      expect(describeAudit(entry('TICKET_CREATED', { ticketCode: 'T' })).alert).toBe(false);
    });
  });

  describe('details', () => {
    it('shows what the sentence does not say, with Spanish names and translated values', () => {
      const text = describeAudit(
        entry('TICKET_CREATED', {
          ticketCode: 'TCK-000142',
          priority: 'HIGH',
          category: 'Hardware',
        }),
      );
      expect(text.details).toEqual([
        { label: 'Prioridad', value: 'Alta' },
        { label: 'Categoría', value: 'Hardware' },
      ]);
    });

    it('formats the size of an attachment', () => {
      const text = describeAudit(
        entry('ATTACHMENT_ADDED', {
          ticketCode: 'T',
          attachmentId: 'f-1',
          contentType: 'image/png',
          sizeBytes: 1536,
        }),
      );
      expect(text.details.find((d) => d.label === 'Tamaño')?.value).toMatch(/1[.,]5 KB/);
      expect(text.details.find((d) => d.label === 'Tipo de archivo')?.value).toBe('image/png');
    });

    it('does not repeat what the sentence and the object already say', () => {
      const text = describeAudit(
        entry('TICKET_STATUS_CHANGED', { ticketCode: 'T-1', from: 'OPEN', to: 'WAITING' }),
      );
      expect(text.details).toEqual([]);
    });

    it('skips empty values, and treats a missing mapa as empty', () => {
      expect(
        describeAudit(entry('LOGIN_SUCCESS', { ip: null, extra: '' }, { entityType: 'USER' }))
          .details,
      ).toEqual([]);
      expect(describeAudit(entry('LOGOUT', null, { entityType: 'USER' })).details).toEqual([]);
    });

    it('shows a key it does not know with its own name, and an object as text', () => {
      const text = describeAudit(
        entry('LOGIN_SUCCESS', { nuevo: { a: 1 }, lista: ['x', 'y'] }, { entityType: 'USER' }),
      );
      expect(text.details).toEqual([
        { label: 'nuevo', value: '{"a":1}' },
        { label: 'lista', value: 'x, y' },
      ]);
    });
  });

  describe('the object', () => {
    it('links to the ticket and to the equipment, labelled with their code', () => {
      expect(describeAudit(entry('TICKET_CREATED', { ticketCode: 'TCK-000142' })).target).toEqual({
        label: 'TCK-000142',
        link: ['/tickets', 't-1'],
      });
      expect(
        describeAudit(
          entry(
            'ASSET_CREATED',
            { assetTag: 'AST-000045' },
            { entityType: 'ASSET', entityId: 'a-1' },
          ),
        ).target,
      ).toEqual({
        label: 'AST-000045',
        link: ['/activos', 'a-1'],
      });
    });

    it('links to the account when the entry says whose it is', () => {
      const text = describeAudit(
        entry('USER_DEACTIVATED', { email: 'a@x.com' }, { entityType: 'USER', entityId: 'u-2' }),
      );
      expect(text.target).toEqual({ label: 'a@x.com', link: ['/usuarios', 'u-2'] });
    });

    it('has no object when someone acts on their own account', () => {
      const text = describeAudit(entry('LOGOUT', null, { entityType: 'USER', entityId: 'u-1' })); // el actor es u-1
      expect(text.target).toBeNull();
    });

    it('has an object when someone acts on another account and the email is not known', () => {
      const text = describeAudit(
        entry('USER_UPDATED', { fields: ['email'] }, { entityType: 'USER', entityId: 'u-2' }),
      );
      expect(text.target).toEqual({ label: 'Usuario', link: ['/usuarios', 'u-2'] });
    });

    it('has no object without an id', () => {
      expect(
        describeAudit(entry('TICKET_CREATED', { ticketCode: 'T' }, { entityId: null })).target,
      ).toBeNull();
    });
  });

  it('survives an action it does not know', () => {
    expect(describeAudit(entry('ALGO_NUEVO', { dato: 1 })).summary).toBe('Acción ALGO_NUEVO');
  });

  it('survives missing data', () => {
    expect(describeAudit(entry('TICKET_CREATED', {})).summary).toBe('Creó el ticket');
    expect(describeAudit(entry('ASSET_ASSIGNED', {}, { entityType: 'ASSET' })).summary).toBe(
      'Asignó el equipo a una persona',
    );
    expect(describeAudit(entry('ACCESS_DENIED', null, { entityType: 'SECURITY' })).summary).toBe(
      'Acceso denegado',
    );
  });
});

describe('the list of actions', () => {
  it('covers the 25 actions of the backend, each one in exactly one group', () => {
    expect(AUDIT_ACTIONS).toHaveLength(25);
    expect(new Set(AUDIT_ACTIONS).size).toBe(25);
    expect(AUDIT_ACTION_GROUPS.map((g) => g.label)).toEqual([
      'Sesión y seguridad',
      'Usuarios',
      'Tickets',
      'Equipos',
    ]);
  });

  it('has a Spanish name for every action', () => {
    expect(Object.keys(AUDIT_ACTION_LABEL).sort()).toEqual([...AUDIT_ACTIONS].sort());
    expect(Object.values(AUDIT_ACTION_LABEL).every((label) => label.length > 0)).toBe(true);
  });
});
