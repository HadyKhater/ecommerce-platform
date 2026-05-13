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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ApiError } from '../../../shared/models/api-error.model';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly destroyed = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyed))
      .subscribe((params) => {
        if (params.get('registered') === 'true') {
          this.successMessage.set(
            'Account created. Sign in with your email and password.',
          );
        }
      });

    this.form.controls.email.valueChanges
      .pipe(takeUntilDestroyed(this.destroyed))
      .subscribe(() => this.errorMessage.set(null));
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyed))
      .subscribe(() => this.errorMessage.set(null));
  }

  protected dismissSuccess(): void {
    this.successMessage.set(null);
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.auth
      .login(this.form.getRawValue())
      .pipe(
        takeUntilDestroyed(this.destroyed),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
          this.router.navigateByUrl(returnUrl);
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.describeError(error));
        },
      });
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

    return 'Something went wrong while signing in.';
  }

  private summarizeApiPayload(body: unknown): string | null {
    const rec = body && typeof body === 'object' && !Array.isArray(body);

    if (
      rec &&
      'detail' in body &&
      typeof (body as Partial<Pick<ApiError, 'detail'>>).detail === 'string'
    ) {
      return (body as ApiError).detail;
    }

    if (
      rec &&
      'title' in body &&
      typeof (body as Partial<Pick<ApiError, 'title'>>).title === 'string'
    ) {
      return (body as ApiError).title;
    }

    if (rec && 'errors' in body) {
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
