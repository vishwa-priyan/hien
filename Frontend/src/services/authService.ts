import { User, UserRole } from '../types';
import { StorageService } from './storage';
import { ApiClient } from './apiClient';

export class AuthService {
  static async getCurrentUser(): Promise<User> {
    try {
      const user = await ApiClient.get<User>('/auth/me');
      StorageService.updateState(prev => ({ ...prev, currentUser: user }));
      return user;
    } catch {
      const state = StorageService.getState();
      return state.currentUser;
    }
  }

  static async switchRole(role: UserRole): Promise<User> {
    try {
      const resp = await ApiClient.post<{ access_token: string; user: User }>('/auth/switch-role', { role });
      ApiClient.setToken(resp.access_token);
      StorageService.updateState(prev => ({ ...prev, currentUser: resp.user }));
      return resp.user;
    } catch {
      const state = StorageService.getState();
      const userWithRole = state.users.find(u => u.role === role) || {
        id: `u-${role}`,
        name: `Demo ${role.toUpperCase()}`,
        email: `${role}@hien-demo.io`,
        role: role,
        status: 'active' as const,
        lastActive: 'Just now',
      };
      StorageService.updateState(prev => ({ ...prev, currentUser: userWithRole }));
      return userWithRole;
    }
  }

  static async login(email: string, password?: string): Promise<User> {
    try {
      const resp = await ApiClient.post<{ access_token: string; user: User }>('/auth/login', {
        email,
        password: password || 'password123',
      });
      ApiClient.setToken(resp.access_token);
      StorageService.updateState(prev => ({ ...prev, currentUser: resp.user }));
      return resp.user;
    } catch {
      const state = StorageService.getState();
      const found = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      const defaultUser = found || state.users[0];
      StorageService.updateState(prev => ({ ...prev, currentUser: defaultUser }));
      return defaultUser;
    }
  }

  static async logout(): Promise<void> {
    try {
      await ApiClient.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      ApiClient.clearToken();
    }
  }
}
