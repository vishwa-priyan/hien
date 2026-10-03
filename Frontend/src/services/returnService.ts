import { ReturnItem, ReturnStatus } from '../types';
import { StorageService } from './storage';
import { ApiClient } from './apiClient';

export class ReturnService {
  static async getReturns(filters?: {
    hubId?: string;
    category?: string;
    status?: ReturnStatus | 'all';
    search?: string;
  }): Promise<ReturnItem[]> {
    try {
      const params: Record<string, string> = {};
      if (filters?.hubId && filters.hubId !== 'all') params.hubId = filters.hubId;
      if (filters?.status && filters.status !== 'all') params.status = filters.status;
      
      let returns = await ApiClient.get<ReturnItem[]>('/returns', params);
      
      if (filters?.category && filters.category !== 'all') {
        returns = returns.filter(r => r.category === filters.category);
      }
      if (filters?.search && filters.search.trim() !== '') {
        const q = filters.search.toLowerCase();
        returns = returns.filter(
          r =>
            r.rmaNumber.toLowerCase().includes(q) ||
            r.productName.toLowerCase().includes(q) ||
            r.sku.toLowerCase().includes(q) ||
            r.orderReference.toLowerCase().includes(q)
        );
      }
      StorageService.updateState(prev => ({ ...prev, returns }));
      return returns;
    } catch {
      let returns = StorageService.getState().returns;
      if (filters?.hubId && filters.hubId !== 'all') returns = returns.filter(r => r.hubId === filters.hubId);
      if (filters?.category && filters.category !== 'all') returns = returns.filter(r => r.category === filters.category);
      if (filters?.status && filters.status !== 'all') returns = returns.filter(r => r.status === filters.status);
      if (filters?.search && filters.search.trim() !== '') {
        const q = filters.search.toLowerCase();
        returns = returns.filter(
          r =>
            r.rmaNumber.toLowerCase().includes(q) ||
            r.productName.toLowerCase().includes(q) ||
            r.sku.toLowerCase().includes(q) ||
            r.orderReference.toLowerCase().includes(q)
        );
      }
      return returns;
    }
  }

  static async getReturnById(id: string): Promise<ReturnItem | null> {
    try {
      const ret = await ApiClient.get<ReturnItem>(`/returns/${id}`);
      return ret;
    } catch {
      const ret = StorageService.getState().returns.find(r => r.id === id);
      return ret || null;
    }
  }

  static async registerReturn(data: {
    sku: string;
    hubId: string;
    quantity: number;
    orderReference: string;
    returnReason: string;
    reportedCondition: 'like_new' | 'minor_wear' | 'damaged' | 'defective' | 'unopened';
    packagingCondition: 'intact' | 'opened_good' | 'damaged' | 'missing';
    accessoryCompleteness: 'complete' | 'partial' | 'missing';
    images: { url: string; caption: string }[];
  }): Promise<ReturnItem> {
    const state = StorageService.getState();
    const product = state.products.find(p => p.sku === data.sku);
    const hub = state.hubs.find(h => h.id === data.hubId);

    const payload = {
      orderReference: data.orderReference || `ORD-WA-${Math.floor(10000 + Math.random() * 90000)}`,
      sku: data.sku,
      productName: product ? product.name : data.sku,
      category: product ? product.category : 'General Goods',
      quantity: data.quantity || 1,
      hubId: data.hubId,
      hubName: hub ? hub.name : data.hubId,
      returnReason: data.returnReason,
      reportedCondition: data.reportedCondition,
      packagingCondition: data.packagingCondition,
      accessoryCompleteness: data.accessoryCompleteness,
      primaryImage: data.images[0]?.url || product?.imageUrl || '',
      images: data.images.map((img, idx) => ({
        url: img.url,
        caption: img.caption || 'Product Photo',
        isPrimary: idx === 0,
        detections: []
      }))
    };

    try {
      const created = await ApiClient.post<ReturnItem>('/returns', payload);
      StorageService.updateState(prev => ({
        ...prev,
        returns: [created, ...prev.returns],
      }));
      return created;
    } catch {
      // Local fallback
      const newId = `ret-${Date.now().toString().slice(-4)}`;
      const rma = `RMA-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const newReturn: ReturnItem = {
        id: newId,
        rmaNumber: rma,
        ...payload,
        status: 'registered',
        createdAt: nowStr,
        updatedAt: nowStr,
        images: payload.images.map((img, idx) => ({
          id: `img-${newId}-${idx+1}`,
          url: img.url,
          caption: img.caption,
          isPrimary: img.isPrimary,
          detections: []
        })),
        historyTimeline: [
          {
            timestamp: nowStr,
            title: 'Return Registered',
            description: `RMA ${rma} issued for ${payload.productName} at ${payload.hubName}.`,
            actor: state.currentUser.name,
            type: 'creation',
          },
        ],
      };
      StorageService.updateState(prev => ({
        ...prev,
        returns: [newReturn, ...prev.returns],
      }));
      return newReturn;
    }
  }
}
