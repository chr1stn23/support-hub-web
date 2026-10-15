import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { HasUnsavedChanges, unsavedChangesGuard } from '@core/auth/unsaved-changes.guard';
import { DialogService } from '@shared/ui';

describe('unsavedChangesGuard', () => {
  const run = (dirty: boolean) =>
    TestBed.runInInjectionContext(() =>
      unsavedChangesGuard(
        { hasUnsavedChanges: () => dirty } satisfies HasUnsavedChanges,
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

  it('lets you leave when there is nothing to lose, without asking', () => {
    const confirm = vi.spyOn(TestBed.inject(DialogService), 'confirm');
    expect(run(false)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before leaving with unsaved changes, with a destructive confirmation', async () => {
    const confirm = vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(true);

    await expect(run(true)).resolves.toBe(true);
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmLabel: 'Salir sin guardar',
        cancelLabel: 'Seguir editando',
        destructive: true,
      }),
    );
  });

  it('stays on the page when the person decides to keep editing', async () => {
    vi.spyOn(TestBed.inject(DialogService), 'confirm').mockResolvedValue(false);
    await expect(run(true)).resolves.toBe(false);
  });
});
