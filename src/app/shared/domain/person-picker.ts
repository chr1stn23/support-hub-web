import {
  ChangeDetectionStrategy,
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';

import type { UserLookup } from '@core/api/models';
import { UsersApi } from '@core/api/users.api';
import { loadable } from '@core/http/loadable';
import { Avatar } from '@shared/ui';
import { Icon } from '@shared/ui';
import { ErrorState } from '@shared/ui';
import { Skeleton } from '@shared/ui';

const SEARCH_DEBOUNCE_MS = 300;
let nextPickerId = 0;

/**
 * Elegir una persona entre muchas: un cuadro de búsqueda y, debajo, una lista de botones de opción nativos.
 * Se recorre con las flechas y los lectores de pantalla la entienden sin ARIA extra. Uso: [(selected)]="persona".
 */
@Component({
  selector: 'app-person-picker',
  imports: [Avatar, Icon, ErrorState, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="picker" [attr.aria-describedby]="error() ? errorId : null">
      <legend class="legend">
        {{ label() }}
        @if (required()) {
          <span class="required" aria-hidden="true">*</span>
        }
      </legend>

      <div class="search">
        <app-icon name="search" [size]="16" />
        <input
          class="control"
          type="search"
          aria-label="Buscar personas"
          placeholder="Buscar por nombre o correo"
          maxlength="100"
          [value]="draft()"
          (input)="draft.set($any($event.target).value)"
          (keydown.enter)="$event.preventDefault()"
        />
      </div>

      @if (failed()) {
        <app-error-state title="No pudimos cargar a las personas" (retry)="people.reload()" />
      } @else if (visible(); as list) {
        @if (list.length === 0) {
          <p class="muted">
            {{ query() ? 'Nadie coincide con «' + query() + '».' : 'No hay personas para elegir.' }}
          </p>
        } @else {
          <ul
            class="options"
            [class.is-stale]="loading()"
            [attr.aria-busy]="loading() ? 'true' : null"
          >
            @for (person of list; track person.id) {
              <li>
                <label class="option" [class.is-selected]="selected()?.id === person.id">
                  <input
                    type="radio"
                    [name]="groupName"
                    [value]="person.id"
                    [checked]="selected()?.id === person.id"
                    (change)="selected.set(person)"
                  />
                  <app-avatar [name]="person.fullName" size="sm" />
                  <span class="option__text">
                    <span class="option__name">{{ person.fullName }}</span>
                    <span class="option__email">{{ person.email }}</span>
                  </span>
                </label>
              </li>
            }
          </ul>
          @if (hasMore()) {
            <p class="muted">
              Mostrando {{ list.length }} de {{ total() }}. Escribe para afinar la búsqueda.
            </p>
          }
        }
      } @else {
        <div role="status" aria-label="Cargando personas"><app-skeleton [lines]="3" /></div>
      }

      <p class="sr-only" aria-live="polite">{{ announcement() }}</p>

      @if (error(); as message) {
        <p class="error" role="alert" [id]="errorId">
          <app-icon name="alert-triangle" [size]="14" />
          {{ message }}
        </p>
      }
    </fieldset>
  `,
  styles: `
    .picker {
      display: grid;
      gap: var(--space-2);
      padding: 0;
      margin: 0;
      border: 0;
    }
    .legend {
      padding: 0;
      margin-bottom: var(--space-1);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }
    .required {
      margin-left: 2px;
      color: var(--color-danger);
    }
    .search {
      position: relative;
    }
    .search app-icon {
      position: absolute;
      top: 50%;
      left: var(--space-3);
      color: var(--color-text-secondary);
      transform: translateY(-50%);
      pointer-events: none;
    }
    .search .control {
      width: 100%;
      padding-left: 2.25rem;
    }
    .options {
      display: grid;
      gap: var(--space-1);
      max-height: 14rem;
      padding: 0;
      margin: 0;
      overflow-y: auto;
      list-style: none;
    }
    .options.is-stale {
      opacity: 0.55;
    }
    .option {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      cursor: pointer;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    .option:hover {
      background: var(--color-bg-subtle);
    }
    .option.is-selected {
      background: var(--color-bg-selected);
      border-color: var(--color-accent);
    }
    .option input {
      flex-shrink: 0;
      margin: 0;
      accent-color: var(--color-accent);
    }
    .option__text {
      display: grid;
      min-width: 0;
    }
    .option__name {
      font-weight: var(--weight-medium);
      overflow-wrap: anywhere;
    }
    .option__email {
      font-size: var(--text-xs);
      color: var(--color-text-secondary);
      overflow-wrap: anywhere;
    }
    .muted {
      font-size: var(--text-sm);
      color: var(--color-text-secondary);
    }
    .error {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-xs);
      color: var(--color-danger);
    }
  `,
})
export class PersonPicker {
  readonly label = input('Persona');
  readonly required = input(false, { transform: booleanAttribute });
  /** Una persona que no debe aparecer (por ejemplo, quien ya tiene el equipo). */
  readonly excludeId = input<string | null>(null);
  readonly error = input<string | null>(null);
  /** La persona elegida. */
  readonly selected = model<UserLookup | null>(null);

  private readonly api = inject(UsersApi);
  protected readonly groupName = `person-picker-${nextPickerId++}`;
  protected readonly errorId = `${this.groupName}-error`;

  protected readonly draft = signal('');
  protected readonly query = toSignal(
    toObservable(this.draft).pipe(
      map((text) => text.trim()),
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
    ),
    { initialValue: '' },
  );

  protected readonly people = loadable(
    () => this.query(),
    (text) => this.api.searchPeople(text),
  );
  private readonly page = this.people.value;

  protected readonly loading = computed(() => this.people.state().status === 'loading');
  protected readonly failed = computed(() => this.people.state().status === 'error');
  protected readonly visible = computed(() => {
    const page = this.page();
    const excluded = this.excludeId();
    return page ? page.content.filter((person) => person.id !== excluded) : null;
  });
  protected readonly total = computed(() => this.page()?.totalElements ?? 0);
  protected readonly hasMore = computed(() => this.total() > (this.page()?.content.length ?? 0));
  protected readonly announcement = computed(() => {
    const list = this.visible();
    if (!list || this.loading()) return '';
    return list.length === 1 ? '1 persona encontrada' : `${list.length} personas encontradas`;
  });
}
