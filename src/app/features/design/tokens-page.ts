import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Swatch {
  readonly name: string;
  readonly variable: string;
}

interface Labeled {
  readonly key: string;
  readonly label: string;
  readonly tone: string;
  readonly voided?: boolean;
}

@Component({
  selector: 'app-tokens-page',
  templateUrl: './tokens-page.html',
  styleUrl: './tokens-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokensPage {
  protected readonly surfaces: Swatch[] = [
    { name: 'Fondo', variable: '--color-bg' },
    { name: 'Fondo sutil', variable: '--color-bg-subtle' },
    { name: 'Hover', variable: '--color-bg-hover' },
    { name: 'Seleccionado', variable: '--color-bg-selected' },
    { name: 'Borde', variable: '--color-border' },
    { name: 'Borde fuerte', variable: '--color-border-strong' },
  ];

  protected readonly texts: Swatch[] = [
    { name: 'Texto', variable: '--color-text' },
    { name: 'Secundario', variable: '--color-text-secondary' },
    { name: 'Placeholder', variable: '--color-text-placeholder' },
    { name: 'Deshabilitado', variable: '--color-text-disabled' },
  ];

  protected readonly accents: Swatch[] = [
    { name: 'Acento', variable: '--color-accent' },
    { name: 'Acento hover', variable: '--color-accent-hover' },
    { name: 'Acento pulsado', variable: '--color-accent-active' },
    { name: 'Peligro', variable: '--color-danger' },
  ];

  protected readonly scale: Swatch[] = [
    { name: '12 px · chips y cabeceras', variable: '--text-xs' },
    { name: '13 px · celdas de tabla', variable: '--text-sm' },
    { name: '14 px · base de la interfaz', variable: '--text-md' },
    { name: '16 px', variable: '--text-lg' },
    { name: '18 px · título de página', variable: '--text-xl' },
    { name: '22 px', variable: '--text-2xl' },
    { name: '28 px · cifra del dashboard', variable: '--text-3xl' },
  ];

  protected readonly spaces = [
    '--space-1',
    '--space-2',
    '--space-3',
    '--space-4',
    '--space-6',
    '--space-8',
    '--space-12',
  ];

  protected readonly radii: Swatch[] = [
    { name: 'sm · controles y chips', variable: '--radius-sm' },
    { name: 'md · tarjetas y menús', variable: '--radius-md' },
    { name: 'lg · diálogos', variable: '--radius-lg' },
  ];

  protected readonly ticketStatuses: Labeled[] = [
    { key: 'OPEN', label: 'Sin asignar', tone: 'neutral' },
    { key: 'IN_PROGRESS', label: 'En curso', tone: 'accent' },
    { key: 'WAITING', label: 'Esperando', tone: 'warning' },
    { key: 'RESOLVED', label: 'Resuelto', tone: 'success' },
    { key: 'CLOSED', label: 'Cerrado', tone: 'neutral-soft' },
    { key: 'CANCELLED', label: 'Cancelado', tone: 'neutral', voided: true },
  ];

  protected readonly assetStatuses: Labeled[] = [
    { key: 'AVAILABLE', label: 'Disponible', tone: 'success' },
    { key: 'ASSIGNED', label: 'Asignado', tone: 'accent' },
    { key: 'MAINTENANCE', label: 'En mantenimiento', tone: 'warning' },
    { key: 'RETIRED', label: 'De baja', tone: 'neutral', voided: true },
  ];

  protected readonly priorities = [
    { key: 'LOW', label: 'Baja', variable: '--priority-low' },
    { key: 'MEDIUM', label: 'Media', variable: '--priority-medium' },
    { key: 'HIGH', label: 'Alta', variable: '--priority-high' },
    { key: 'CRITICAL', label: 'Crítica', variable: '--priority-critical' },
  ];

  protected readonly sampleRows = [
    {
      code: 'TCK-000142',
      title: 'Laptop no enciende',
      status: this.ticketStatuses[1],
      age: 12,
    },
    {
      code: 'TCK-000141',
      title: 'VPN se desconecta cada pocos minutos',
      status: this.ticketStatuses[0],
      age: 45,
    },
    {
      code: 'TCK-000139',
      title: 'Acceso a la carpeta de Finanzas',
      status: this.ticketStatuses[2],
      age: 180,
    },
    {
      code: 'TCK-000137',
      title: 'Pantalla parpadea en la sala 3',
      status: this.ticketStatuses[3],
      age: 1440,
    },
  ];
}
