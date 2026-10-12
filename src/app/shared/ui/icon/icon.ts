import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';
import { IconName, ICONS } from './icons';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-spinning]': 'spin()' },
  imports: [],
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
      [attr.width]="size()"
      [attr.height]="size()"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label() || null"
      [attr.aria-hidden]="label() ? null : 'true'"
    >
      @for (shape of shapes(); track $index) {
        @switch (shape.tag) {
          @case ('path') {
            <path [attr.d]="shape.d" />
          }
          @case ('circle') {
            <circle [attr.cx]="shape.cx" [attr.cy]="shape.cy" [attr.r]="shape.r" />
          }
          @case ('rect') {
            <rect
              [attr.x]="shape.x"
              [attr.y]="shape.y"
              [attr.width]="shape.w"
              [attr.height]="shape.h"
              [attr.rx]="shape.rx"
            />
          }
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      line-height: 0;
    }
    :host(.is-spinning) svg {
      animation: icon-spin 0.9s linear infinite;
    }
    @keyframes icon-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(16, { transform: numberAttribute });

  readonly label = input<string | null>(null);
  readonly spin = input(false, { transform: booleanAttribute });

  protected readonly shapes = computed(() => ICONS[this.name()]);
}
