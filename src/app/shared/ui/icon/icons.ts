/** Una forma SVG. Un solo tipo con campos opcionales: así la plantilla no necesita estrechar tipos. */
export interface Shape {
  readonly tag: 'path' | 'circle' | 'rect';
  readonly d?: string;
  readonly cx?: number;
  readonly cy?: number;
  readonly r?: number;
  readonly x?: number;
  readonly y?: number;
  readonly w?: number;
  readonly h?: number;
  readonly rx?: number;
}

const path = (d: string): Shape => ({ tag: 'path', d });
const circle = (cx: number, cy: number, r: number): Shape => ({ tag: 'circle', cx, cy, r });
const rect = (x: number, y: number, w: number, h: number, rx = 0): Shape => ({
  tag: 'rect',
  x,
  y,
  w,
  h,
  rx,
});

// Cuadrícula de 24x24, trazo de 1,75 y extremos redondeados (los aplica el componente)
export const ICONS = {
  // Navegación y flechas
  'chevron-down': [path('m6 9 6 6 6-6')],
  'chevron-up': [path('m18 15-6-6-6 6')],
  'chevron-left': [path('m15 18-6-6 6-6')],
  'chevron-right': [path('m9 18 6-6-6-6')],
  'chevrons-left': [path('m11 17-5-5 5-5'), path('m18 17-5-5 5-5')],
  'chevrons-right': [path('m6 17 5-5-5-5'), path('m13 17 5-5-5-5')],
  'chevrons-up': [path('m17 11-5-5-5 5'), path('m17 18-5-5-5 5')],
  'arrow-up': [path('M12 19V5'), path('m5 12 7-7 7 7')],
  'arrow-down': [path('M12 5v14'), path('m19 12-7 7-7-7')],
  'arrows-up-down': [path('m8 9 4-4 4 4'), path('m8 15 4 4 4-4')],
  equal: [path('M5 9h14'), path('M5 15h14')],

  // Acciones
  x: [path('M18 6 6 18'), path('m6 6 12 12')],
  check: [path('M20 6 9 17l-5-5')],
  plus: [path('M5 12h14'), path('M12 5v14')],
  minus: [path('M5 12h14')],
  search: [circle(11, 11, 7), path('m20 20-3.5-3.5')],
  refresh: [
    path('M20 11a8 8 0 0 0-14.5-3.5L4 9'),
    path('M4 4v5h5'),
    path('M4 13a8 8 0 0 0 14.5 3.5L20 15'),
    path('M20 20v-5h-5'),
  ],
  pencil: [path('M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z'), path('m14 7 3 3')],
  trash: [
    path('M4 7h16'),
    path('M9 7V4h6v3'),
    path('M6 7l1 13h10l1-13'),
    path('M10 11v6'),
    path('M14 11v6'),
  ],
  download: [path('M12 4v12'), path('m7 11 5 5 5-5'), path('M5 20h14')],
  paperclip: [
    path('m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7'),
  ],
  'more-horizontal': [circle(5, 12, 1), circle(12, 12, 1), circle(19, 12, 1)],

  // Estados y avisos
  info: [circle(12, 12, 9), path('M12 11v5'), path('M12 7.8h.01')],
  'check-circle': [circle(12, 12, 9), path('m8 12 3 3 5-6')],
  'x-circle': [circle(12, 12, 9), path('m9 9 6 6'), path('m15 9-6 6')],
  'alert-triangle': [path('M12 3.5 2.5 20h19L12 3.5Z'), path('M12 10v4'), path('M12 17.2h.01')],
  loader: [path('M12 3a9 9 0 1 0 9 9')],
  inbox: [path('M3 13h5l1.5 3h5l1.5-3h5'), path('M5 5h14l2 8v6H3v-6l2-8Z')],

  // Aplicación
  menu: [path('M4 6h16'), path('M4 12h16'), path('M4 18h16')],
  bell: [path('M6 17v-6a6 6 0 1 1 12 0v6l1.5 2h-15L6 17Z'), path('M10 21.5h4')],
  user: [circle(12, 8, 4), path('M4 21a8 8 0 0 1 16 0')],
  users: [
    circle(9, 8, 3.5),
    path('M2.5 20a6.5 6.5 0 0 1 13 0'),
    path('M16 4.6a3.5 3.5 0 0 1 0 6.8'),
    path('M18.5 14a6.5 6.5 0 0 1 3 6'),
  ],
  'log-out': [
    path('M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4'),
    path('m16 8 4 4-4 4'),
    path('M20 12H9'),
  ],
  ticket: [rect(3, 6, 18, 12, 2), path('M9 6v12')],
  laptop: [rect(5, 5, 14, 10, 1.5), path('M2.5 19h19')],
  'layout-dashboard': [
    rect(3, 3, 8, 9, 1),
    rect(13, 3, 8, 5, 1),
    rect(13, 10, 8, 11, 1),
    rect(3, 14, 8, 7, 1),
  ],
  'clipboard-list': [rect(6, 4, 12, 17, 2), path('M9 4h6v3H9Z'), path('M9 12h6'), path('M9 16h6')],
  box: [path('M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z'), path('M3 7.5 12 12l9-4.5'), path('M12 12v9')],
  file: [path('M7 3h7l5 5v13H7V3Z'), path('M14 3v5h5')],
  'file-text': [path('M7 3h7l5 5v13H7V3Z'), path('M14 3v5h5'), path('M10 13h6'), path('M10 17h6')],
  image: [rect(4, 5, 16, 14, 2), circle(9, 10, 1.5), path('m5 17 4.5-4.5 3.5 3.5 2-2L20 17')],
  eye: [path('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z'), circle(12, 12, 3)],
  'eye-off': [
    path('M3 3l18 18'),
    path('M10.6 6.1A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9'),
    path('M6.6 6.6A17 17 0 0 0 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.9-.7'),
    path('M9.9 9.9a3 3 0 0 0 4.2 4.2'),
  ],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof ICONS;
