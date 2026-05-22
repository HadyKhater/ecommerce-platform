export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ORDER' | 'PAYMENT' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
}
