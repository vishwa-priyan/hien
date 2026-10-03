import { User } from '../types';
import { StorageService } from './storage';
import { ApiClient } from './apiClient';

export class UserService {
  static async getUsers(): Promise<User[]> {
    try {
      const users = await ApiClient.get<User[]>('/users');
      StorageService.updateState(prev => ({ ...prev, users }));
      return users;
    } catch {
      return StorageService.getState().users;
    }
  }

  static async createUser(userData: Omit<User, 'id' | 'lastActive'>): Promise<User> {
    try {
      const created = await ApiClient.post<User>('/users', userData);
      StorageService.updateState(prev => ({
        ...prev,
        users: [...prev.users, created],
      }));
      return created;
    } catch {
      const newUser: User = {
        ...userData,
        id: `u-${Date.now().toString().slice(-4)}`,
        lastActive: 'Just registered',
      };
      StorageService.updateState(prev => ({
        ...prev,
        users: [...prev.users, newUser],
      }));
      return newUser;
    }
  }

  static async updateUser(id: string, updates: Partial<User>): Promise<User> {
    try {
      const updated = await ApiClient.patch<User>(`/users/${id}`, updates);
      StorageService.updateState(prev => ({
        ...prev,
        users: prev.users.map(u => (u.id === id ? updated : u)),
      }));
      return updated;
    } catch {
      let updated: User | null = null;
      StorageService.updateState(prev => {
        const existing = prev.users.find(u => u.id === id);
        if (!existing) return prev;
        updated = { ...existing, ...updates };
        return {
          ...prev,
          users: prev.users.map(u => (u.id === id ? updated! : u)),
        };
      });
      return updated!;
    }
  }

  static async toggleUserStatus(id: string): Promise<User> {
    const users = await this.getUsers();
    const user = users.find(u => u.id === id);
    if (!user) ApiClient.throwError('User not found', 404);

    const nextStatus = user!.status === 'active' ? 'inactive' : 'active';
    return this.updateUser(id, { status: nextStatus });
  }
}
