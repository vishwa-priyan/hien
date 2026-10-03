import { Hub } from '../types';
import { StorageService } from './storage';
import { ApiClient } from './apiClient';
import { AuditService } from './auditService';

export class HubService {
  static async getHubs(): Promise<Hub[]> {
    try {
      const hubs = await ApiClient.get<Hub[]>('/hubs');
      StorageService.updateState(prev => ({ ...prev, hubs }));
      return hubs;
    } catch {
      return StorageService.getState().hubs;
    }
  }

  static async getHubById(id: string): Promise<Hub | null> {
    try {
      return await ApiClient.get<Hub>(`/hubs/${id}`);
    } catch {
      const hubs = StorageService.getState().hubs;
      return hubs.find(h => h.id === id) || null;
    }
  }

  static async createHub(hubData: Omit<Hub, 'id' | 'currentOccupancy'>): Promise<Hub> {
    try {
      const id = `hub-${hubData.city.toLowerCase().substring(0, 3)}-${Math.floor(10 + Math.random() * 90)}`;
      const payload = { ...hubData, id, currentOccupancy: 0 };
      const newHub = await ApiClient.post<Hub>('/hubs', payload);
      StorageService.updateState(prev => ({
        ...prev,
        hubs: [...prev.hubs, newHub],
      }));
      return newHub;
    } catch {
      const newHub: Hub = {
        ...hubData,
        id: `hub-${hubData.city.toLowerCase().substring(0, 3)}-${Math.floor(10 + Math.random() * 90)}`,
        currentOccupancy: 0,
      };
      StorageService.updateState(prev => ({
        ...prev,
        hubs: [...prev.hubs, newHub],
      }));
      return newHub;
    }
  }

  static async updateHub(id: string, updates: Partial<Hub>): Promise<Hub> {
    try {
      const updated = await ApiClient.patch<Hub>(`/hubs/${id}`, updates);
      StorageService.updateState(prev => ({
        ...prev,
        hubs: prev.hubs.map(h => (h.id === id ? updated : h)),
      }));
      return updated;
    } catch {
      let updatedHub: Hub | null = null;
      StorageService.updateState(prev => {
        const existing = prev.hubs.find(h => h.id === id);
        if (!existing) return prev;
        updatedHub = { ...existing, ...updates };
        return {
          ...prev,
          hubs: prev.hubs.map(h => (h.id === id ? updatedHub! : h)),
        };
      });
      return updatedHub!;
    }
  }

  static async toggleOperatingStatus(id: string): Promise<Hub> {
    const hub = await this.getHubById(id);
    if (!hub) ApiClient.throwError('Hub not found', 404);

    const nextStatus = hub.operatingStatus === 'active' ? 'inactive' : 'active';
    return this.updateHub(id, { operatingStatus: nextStatus });
  }
}
