import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

import { environment } from '../../../environments/environment';
import { Notification } from '../models/notification.model';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  /** Signals for notification state management */
  readonly notifications = signal<Notification[]>([]);
  readonly unreadCount = signal<number>(0);

  private stompClient: any = null;
  private connecting = false;
  private connected = false;

  /** Get user's notifications */
  getNotifications(userId: string): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.baseUrl}/user/${userId}`).pipe(
      tap((data) => this.notifications.set(data))
    );
  }

  /** Mark a notification as read */
  markAsRead(id: string): Observable<Notification> {
    return this.http.put<Notification>(`${this.baseUrl}/${id}/read`, {}).pipe(
      tap(() => {
        // Update local state signals
        this.notifications.update((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        this.unreadCount.update((count) => Math.max(0, count - 1));
      })
    );
  }

  /** Mark all unread notifications as read locally and remotely */
  markAllAsRead(): void {
    const unreadNotifications = this.notifications().filter((n) => !n.isRead);
    unreadNotifications.forEach((n) => {
      this.markAsRead(n.id).subscribe({
        error: (err) => console.error(`Failed to mark notification ${n.id} as read:`, err)
      });
    });
  }

  /** Get count of unread notifications */
  getUnreadCount(userId: string): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/user/${userId}/unread-count`).pipe(
      tap((count) => this.unreadCount.set(count))
    );
  }

  /** Connect to WebSocket notifications channel */
  connect(userId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.connected || this.connecting) {
      return;
    }

    this.connecting = true;

    try {
      const socket = new SockJS('http://localhost:8086/ws');

      this.stompClient = new Client({
        webSocketFactory: () => socket,
        onConnect: () => {
          this.connected = true;
          this.connecting = false;
          console.log('Successfully connected to WebSocket broker');
          this.stompClient.subscribe(`/topic/notifications/${userId}`, (message: any) => {
            if (message.body) {
              try {
                const newNotification: Notification = JSON.parse(message.body);
                const exists = this.notifications().some((n) => n.id === newNotification.id);
                if (!exists) {
                  this.notifications.update((prev) => [newNotification, ...prev]);
                  this.unreadCount.update((count) => count + 1);
                }
              } catch (e) {
                console.error('Error parsing inbound WebSocket message body:', e);
              }
            }
          });
        },
        onStompError: (frame) => {
          console.error('WebSocket connection error, scheduling reconnect:', frame);
          this.connected = false;
          this.connecting = false;
          this.stompClient = null;
          setTimeout(() => {
            if (!this.connected && !this.connecting) {
              this.connect(userId);
            }
          }, 5000);
        }
      });

      this.stompClient.activate();
    } catch (err) {
      console.error('Error initializing WebSocket client:', err);
      this.connected = false;
      this.connecting = false;
    }
  }

  /** Disconnect WebSocket client */
  disconnect(): void {
    this.connected = false;
    this.connecting = false;
    if (this.stompClient) {
      try {
        this.stompClient.deactivate();
      } catch (err) {
        console.error('Error disconnecting WebSocket client:', err);
      }
      this.stompClient = null;
    }
  }
}
