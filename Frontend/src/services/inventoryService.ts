import { InventoryItem } from '../types';
import { StorageService } from './storage';
import { ApiClient } from './apiClient';

export class InventoryService {
  static async getInventory(filters?: {
    hubId?: string;
    category?: string;
    disposition?: string;
    search?: string;
  }): Promise<InventoryItem[]> {
    try {
      const params: Record<string, string> = {};
      if (filters?.hubId && filters.hubId !== 'all') params.hubId = filters.hubId;
      if (filters?.disposition && filters.disposition !== 'all') params.disposition = filters.disposition;

      let items = await ApiClient.get<InventoryItem[]>('/inventory', params);

      if (filters?.category && filters.category !== 'all') {
        items = items.filter(i => i.category === filters.category);
      }
      if (filters?.search && filters.search.trim() !== '') {
        const q = filters.search.toLowerCase();
        items = items.filter(
          i =>
            i.sku.toLowerCase().includes(q) ||
            i.productName.toLowerCase().includes(q) ||
            i.storageLocation.toLowerCase().includes(q)
        );
      }
      StorageService.updateState(prev => ({ ...prev, inventory: items }));
      return items;
    } catch {
      let items = StorageService.getState().inventory;
      if (filters?.hubId && filters.hubId !== 'all') items = items.filter(i => i.hubId === filters.hubId);
      if (filters?.category && filters.category !== 'all') items = items.filter(i => i.category === filters.category);
      if (filters?.disposition && filters.disposition !== 'all') items = items.filter(i => i.disposition === filters.disposition);
      if (filters?.search && filters.search.trim() !== '') {
        const q = filters.search.toLowerCase();
        items = items.filter(
          i =>
            i.sku.toLowerCase().includes(q) ||
            i.productName.toLowerCase().includes(q) ||
            i.storageLocation.toLowerCase().includes(q)
        );
      }
      return items;
    }
  }

  static async getInventoryItem(id: string): Promise<InventoryItem | null> {
    try {
      const items = await this.getInventory();
      return items.find(i => i.id === id) || null;
    } catch {
      return StorageService.getState().inventory.find(i => i.id === id) || null;
    }
  }

  static async reserveStock(sku: string, hubId: string, quantity: number): Promise<InventoryItem> {
    const state = StorageService.getState();
    const item = state.inventory.find(
      i => i.sku === sku && i.hubId === hubId && i.disposition === 'sellable'
    );
    if (!item) {
      ApiClient.throwError(`No sellable inventory found for SKU ${sku} at hub ${hubId}`, 404);
    }

    try {
      const updated = await ApiClient.patch<InventoryItem>(`/inventory/${item.id}`, {
        availableQuantity: item.availableQuantity - quantity,
        reservedQuantity: item.reservedQuantity + quantity,
        notes: `Reserved ${quantity} units for order`
      });
      return updated;
    } catch {
      // Local fallback
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const updatedItem = {
        ...item,
        availableQuantity: item.availableQuantity - quantity,
        reservedQuantity: item.reservedQuantity + quantity,
        lastUpdated: nowStr,
      };
      StorageService.updateState(prev => ({
        ...prev,
        inventory: prev.inventory.map(i => (i.id === item.id ? updatedItem : i)),
      }));
      return updatedItem;
    }
  }

  static async releaseReservation(sku: string, hubId: string, quantity: number): Promise<InventoryItem> {
    const state = StorageService.getState();
    const item = state.inventory.find(
      i => i.sku === sku && i.hubId === hubId && i.disposition === 'sellable'
    );
    if (!item) {
      ApiClient.throwError(`No inventory found for SKU ${sku} at hub ${hubId}`, 404);
    }

    try {
      const updated = await ApiClient.patch<InventoryItem>(`/inventory/${item.id}`, {
        availableQuantity: item.availableQuantity + quantity,
        reservedQuantity: Math.max(0, item.reservedQuantity - quantity),
        notes: `Released reservation of ${quantity} units`
      });
      return updated;
    } catch {
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const updatedItem = {
        ...item,
        availableQuantity: item.availableQuantity + quantity,
        reservedQuantity: Math.max(0, item.reservedQuantity - quantity),
        lastUpdated: nowStr,
      };
      StorageService.updateState(prev => ({
        ...prev,
        inventory: prev.inventory.map(i => (i.id === item.id ? updatedItem : i)),
      }));
      return updatedItem;
    }
  }

  static async updateStock(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    try {
      const updated = await ApiClient.patch<InventoryItem>(`/inventory/${id}`, updates);
      StorageService.updateState(prev => ({
        ...prev,
        inventory: prev.inventory.map(i => (i.id === id ? updated : i)),
      }));
      return updated;
    } catch {
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      let updatedItem: InventoryItem | null = null;
      StorageService.updateState(prev => ({
        ...prev,
        inventory: prev.inventory.map(i => {
          if (i.id === id) {
            updatedItem = { ...i, ...updates, lastUpdated: nowStr };
            return updatedItem;
          }
          return i;
        }),
      }));
      return updatedItem!;
    }
  }
}
