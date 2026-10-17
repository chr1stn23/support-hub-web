import { TestBed } from '@angular/core/testing';
import { FileSaver } from '@core/http/file-saver';

describe('FileSaver', () => {
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };

  beforeEach(() => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:fake-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
  });

  it('hands the file to the browser as a download with that name, and cleans up', () => {
    let link: HTMLAnchorElement | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      link = this;
    });
    const blob = new Blob(['hola']);

    TestBed.inject(FileSaver).save(blob, 'informe de ventas.pdf');

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(link?.download).toBe('informe de ventas.pdf');
    expect(link?.getAttribute('href')).toBe('blob:fake-url');
    expect(document.body.contains(link ?? null)).toBe(false); // el enlace temporal no queda en la página

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });
});
