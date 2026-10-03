import { NotificationItem } from '../types';
import { StorageService } from './storage';
import { ApiClient } from './apiClient';

export class NotificationService {
  static async getNotifications(): Promise<NotificationItem[]> {
    try {
      const items = await ApiClient.get<NotificationItem[]>('/notifications');
      StorageService.updateState(prev => ({ ...prev, notifications: items }));
      return items;
    } catch {
      return StorageService.getState().notifications;
    }
  }

  static async markAsRead(id: string): Promise<void> {
    try {
      await ApiClient.patch(`/notifications/${id}/read`);
    } catch {
      // ignore
    }
    StorageService.updateState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  }

  static async markAllAsRead(): Promise<void> {
    StorageService.updateState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
    }));
  }

  static async addNotification(notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>): Promise<NotificationItem> {
    const newItem: NotificationItem = {
      id: `notif-${Date.now()}`,
      timestamp: 'Just now',
      read: false,
      ...notif,
    };

    StorageService.updateState(prev => ({
      ...prev,
      notifications: [newItem, ...prev.notifications],
    }));

    return newItem;
  }
}
