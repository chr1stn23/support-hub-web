import { buildUpdate, EditModel, modelOf, rebase } from '@features/tickets/edit-changes';

const baseline: EditModel = {
  title: 'VPN caída',
  description: 'Se corta cada cinco minutos.',
  categoryId: 'cat-1',
  priority: 'MEDIUM',
};

describe('modelOf', () => {
  it('takes the editable fields of a ticket', () => {
    expect(
      modelOf({
        title: 'T',
        description: 'D',
        category: { id: 'c', name: 'Red' },
        priority: 'HIGH',
      }),
    ).toEqual({
      title: 'T',
      description: 'D',
      categoryId: 'c',
      priority: 'HIGH',
    });
  });
});

describe('buildUpdate', () => {
  it('is null when nothing changed', () => {
    expect(buildUpdate({ ...baseline }, baseline, 3, true)).toBeNull();
  });

  it('is null when the only change is spaces around the text', () => {
    expect(buildUpdate({ ...baseline, title: '  VPN caída  ' }, baseline, 3, true)).toBeNull();
  });

  it('sends only what changed, trimmed, with the version that was read', () => {
    expect(buildUpdate({ ...baseline, title: '  VPN caída en casa ' }, baseline, 3, true)).toEqual({
      version: 3,
      title: 'VPN caída en casa',
    });
  });

  it('includes category and priority when they change', () => {
    expect(
      buildUpdate({ ...baseline, categoryId: 'cat-2', priority: 'CRITICAL' }, baseline, 0, true),
    ).toEqual({
      version: 0,
      categoryId: 'cat-2',
      priority: 'CRITICAL',
    });
  });

  it('ignores category and priority for someone who may not edit them', () => {
    expect(
      buildUpdate({ ...baseline, categoryId: 'cat-2', priority: 'CRITICAL' }, baseline, 0, false),
    ).toBeNull();
    expect(
      buildUpdate({ ...baseline, title: 'Nuevo', priority: 'LOW' }, baseline, 0, false),
    ).toEqual({
      version: 0,
      title: 'Nuevo',
    });
  });
});

describe('rebase', () => {
  const fresh: EditModel = {
    title: 'VPN caída (revisado)',
    description: baseline.description,
    categoryId: 'cat-1',
    priority: 'CRITICAL',
  };

  it('keeps what the person changed and takes the rest from the server', () => {
    const mine = { ...baseline, title: 'Mi título nuevo' };
    const result = rebase(mine, baseline, fresh);

    expect(result.model).toEqual({ ...fresh, title: 'Mi título nuevo' });
    expect(result.model.priority).toBe('CRITICAL'); // el cambio del otro, que yo no tocaba, se incorpora
  });

  it('makes the server version the new baseline', () => {
    expect(rebase({ ...baseline, title: 'Mi título' }, baseline, fresh).baseline).toEqual(fresh);
  });

  it('with no changes of its own, simply adopts the server version', () => {
    expect(rebase({ ...baseline }, baseline, fresh).model).toEqual(fresh);
  });

  it("after the rebase, saving only sends the person's own changes", () => {
    const result = rebase({ ...baseline, title: 'Mi título' }, baseline, fresh);
    expect(buildUpdate(result.model, result.baseline, 5, true)).toEqual({
      version: 5,
      title: 'Mi título',
    });
  });
});
