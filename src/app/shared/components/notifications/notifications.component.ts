import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  effect
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../../shared/services/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { Notification } from '../../../shared/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  readonly isOpen = signal(false);

  constructor() {
    // Monitor user log in / log out state
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.loadInitialData(user.id);
      } else {
        this.notificationService.disconnect();
        this.notificationService.notifications.set([]);
        this.notificationService.unreadCount.set(0);
        this.isOpen.set(false);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // Initial setup if user is already logged in
    const user = this.authService.user();
    if (user) {
      this.loadInitialData(user.id);
    }
  }

  ngOnDestroy(): void {
    this.notificationService.disconnect();
  }

  private loadInitialData(userId: string): void {
    this.notificationService.getNotifications(userId).subscribe({
      error: (err) => console.error('Failed to load notifications:', err)
    });
    this.notificationService.getUnreadCount(userId).subscribe({
      error: (err) => console.error('Failed to load unread count:', err)
    });
    this.notificationService.connect(userId);
  }

  toggleDropdown(): void {
    if (this.authService.isLoggedIn()) {
      this.isOpen.update((v) => !v);
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  markAsRead(notification: Notification, event: Event): void {
    event.stopPropagation();
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe({
        error: (err) => console.error('Failed to mark notification as read:', err)
      });
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  onNotificationClick(notification: Notification, event: Event): void {
    this.markAsRead(notification, event);
    this.closeDropdown();

    if (notification.type === 'ORDER') {
      void this.router.navigate(['/orders']);
    } else if (notification.type === 'PAYMENT') {
      void this.router.navigate(['/orders']);
    }
  }

  /**
   * Generates a relative, human-readable time string like "Just now", "2 minutes ago", etc.
   */
  getRelativeTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  getNotificationIcon(type: 'ORDER' | 'PAYMENT' | 'SYSTEM'): string {
    switch (type) {
      case 'ORDER':
        return 'shopping_bag';
      case 'PAYMENT':
        return 'credit_card';
      case 'SYSTEM':
      default:
        return 'notifications_active';
    }
  }
}
