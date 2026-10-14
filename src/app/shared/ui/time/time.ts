import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { absoluteDateTime, relativeTime } from './relative-time';

/** Un instante en lenguaje natural, con la fecha exacta al pasar el ratón. Semántico: usa <time>. */
@Component({
  selector: 'app-time',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<time [attr.datetime]="value()" [attr.title]="absolute()">{{ relative() }}</time>`,
})
export class Time {
  readonly value = input.required<string>();

  protected readonly relative = computed(() => relativeTime(this.value()));
  protected readonly absolute = computed(() => absoluteDateTime(this.value()));
}
