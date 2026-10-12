import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { ASSET_STATUS_ORDER, AssetStatusChip, PRIORITY_ORDER, PriorityBadge, TICKET_STATUS_ORDER, TicketStatusChip } from "@shared/domain";
import { Avatar, Button, ButtonSize, ButtonVariant, Chip, Control, Field, Icon, IconName, ICONS, Tone } from "@shared/ui";

@Component({
  selector: 'app-components-page',
  imports: [
    Icon,
    Button,
    Field,
    Control,
    Chip,
    Avatar,
    TicketStatusChip,
    AssetStatusChip,
    PriorityBadge,
  ],
  templateUrl: './components-page.html',
  styleUrl: './components-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponentsPage {
  protected readonly iconNames = Object.keys(ICONS) as IconName[];
  protected readonly variants: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger'];
  protected readonly sizes: ButtonSize[] = ['sm', 'md', 'lg'];
  protected readonly tones: Tone[] = [
    'neutral',
    'neutral-soft',
    'accent',
    'warning',
    'success',
    'danger',
  ];
  protected readonly ticketStatuses = TICKET_STATUS_ORDER;
  protected readonly assetStatuses = ASSET_STATUS_ORDER;
  protected readonly priorities = PRIORITY_ORDER;
  protected readonly names = [
    'Lucía Usuaria',
    'Carlos Agente',
    'Elena Agente',
    'Ana Admin',
    'Mario Activos',
    'Beto',
  ];

  protected readonly saving = signal(false);
  protected readonly checked = signal(true);

  protected simulateSave(): void {
    this.saving.set(true);
    setTimeout(() => this.saving.set(false), 1500);
  }
}
