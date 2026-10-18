import { buildUserUpdate, rebaseUser, userFormModelOf } from './user-edit-changes';

const baseline = { fullName: 'Elena Agente', email: 'elena@supporthub.local' };

describe('buildUserUpdate', () => {
  it('is null when nothing changed, and when the only changes are spaces or the case of the email', () => {
    expect(buildUserUpdate({ ...baseline }, baseline, 3)).toBeNull();
    expect(
      buildUserUpdate(
        { fullName: '  Elena Agente ', email: ' ELENA@supporthub.local ' },
        baseline,
        3,
      ),
    ).toBeNull();
  });

  it('sends only what changed, trimmed, with the version that was read', () => {
    expect(buildUserUpdate({ ...baseline, fullName: '  Elena Pérez ' }, baseline, 3)).toEqual({
      version: 3,
      fullName: 'Elena Pérez',
    });
    expect(buildUserUpdate({ ...baseline, email: ' nueva@x.com ' }, baseline, 3)).toEqual({
      version: 3,
      email: 'nueva@x.com',
    });
  });
});

describe('userFormModelOf', () => {
  it('takes the editable fields', () => {
    expect(userFormModelOf({ fullName: 'A', email: 'a@x.com' })).toEqual({
      fullName: 'A',
      email: 'a@x.com',
    });
  });
});

describe('rebaseUser', () => {
  const fresh = { fullName: 'Elena (revisado)', email: 'nueva@supporthub.local' };

  it('keeps what the person changed and takes the rest from the server', () => {
    const result = rebaseUser({ ...baseline, fullName: 'Mi nombre' }, baseline, fresh);
    expect(result.model).toEqual({ fullName: 'Mi nombre', email: 'nueva@supporthub.local' });
  });

  it("after the rebase, saving only sends the person's own change", () => {
    const result = rebaseUser({ ...baseline, fullName: 'Mi nombre' }, baseline, fresh);
    expect(result.baseline).toEqual(fresh);
    expect(buildUserUpdate(result.model, result.baseline, 5)).toEqual({
      version: 5,
      fullName: 'Mi nombre',
    });
  });

  it('with no changes of its own, simply adopts the server version', () => {
    expect(rebaseUser({ ...baseline }, baseline, fresh).model).toEqual(fresh);
  });
});
