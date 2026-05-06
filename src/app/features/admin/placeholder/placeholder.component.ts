import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [TitleCasePipe],
  templateUrl: './placeholder.component.html',
  styleUrl: './placeholder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderComponent {
  private readonly route = inject(ActivatedRoute);

  readonly section = this.route.snapshot.routeConfig?.path ?? 'section';
}
