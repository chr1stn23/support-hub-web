import { Directive, inject } from '@angular/core';
import { Field } from './field';

/**
 * Se aplica a un <input>, <textarea> o <select> nativo. Le da el estilo del kit y, si está dentro
 * de un <app-field>, conecta etiqueta, ayuda y error con los atributos de accesibilidad.
 * Nota: sustituye el id del elemento por el que genera el campo.
 */
@Directive({
  selector: 'input[appControl], textarea[appControl], select[appControl]',
  host: {
    class: 'control',
    '[attr.id]': 'field?.controlId',
    '[attr.aria-invalid]': "field?.hasError() ? 'true' : null",
    '[attr.aria-describedby]': 'field?.describedBy()',
    '[attr.aria-required]': "field?.required() ? 'true' : null",
  },
})
export class Control {
  readonly field = inject(Field, { optional: true });
}
