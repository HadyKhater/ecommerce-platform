import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiError } from '../../../shared/models/api-error.model';
import { AuthService } from '../../../shared/services/auth.service';

const PASSWORD_STRENGTH = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly destroyed = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    fullName: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(255),
      ],
    ],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(PASSWORD_STRENGTH),
      ],
    ],
  });

  constructor() {
    for (const key of ['fullName', 'email', 'password'] as const) {
      this.form.controls[key].valueChanges
        .pipe(takeUntilDestroyed(this.destroyed))
        .subscribe(() => this.errorMessage.set(null));
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth
      .register(this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyed),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: async () => {
          await this.router.navigate(['/login'], {
            queryParams: { registered: 'true' },
          });
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.describeError(error));
        },
      });
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'Unable to reach the storefront API.';
    }

    if (error instanceof HttpErrorResponse) {
      const summarized = this.summarizeApiPayload(error.error);
      if (summarized) {
        return summarized;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Something went wrong while creating your account.';
  }

  private summarizeApiPayload(body: unknown): string | null {
    const record =
      body && typeof body === 'object' && !Array.isArray(body);

    if (
      record &&
      'detail' in body &&
      typeof (body as Partial<Pick<ApiError, 'detail'>>).detail === 'string'
    ) {
      return (body as ApiError).detail;
    }

    if (
      record &&
      'title' in body &&
      typeof (body as Partial<Pick<ApiError, 'title'>>).title === 'string'
    ) {
      return (body as ApiError).title;
    }

    if (record && 'errors' in body) {
      const fieldErrors = (body as Partial<Pick<ApiError, 'errors'>>).errors;
      if (
        fieldErrors &&
        typeof fieldErrors === 'object' &&
        !Array.isArray(fieldErrors)
      ) {
        const flattened = Object.values(fieldErrors)
          .filter((value): value is string => typeof value === 'string')
          .join(' ');
        if (flattened) {
          return flattened;
        }
      }
    }

    return null;
  }
}
