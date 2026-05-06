import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  templateUrl: './forbidden.component.html',
  styleUrls: ['./forbidden.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenComponent {}
