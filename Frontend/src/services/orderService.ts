import { LocalOrder, OrderStatus } from '../types';
import { StorageService } from './storage';
import { ApiClient } from './apiClient';

export class OrderService {
  static async getOrders(filters?: {
    hubId?: string;
    status?: OrderStatus | 'all';
  }): Promise<LocalOrder[]> {
    try {
      const params: Record<string, string> = {};
      if (filters?.hubId && filters.hubId !== 'all') params.hubId = filters.hubId;
      if (filters?.status && filters.status !== 'all') params.status = filters.status;

      const orders = await ApiClient.get<LocalOrder[]>('/orders', params);
      StorageService.updateState(prev => ({ ...prev, orders }));
      return orders;
    } catch {
      let orders = StorageService.getState().orders;
      if (filters?.hubId && filters.hubId !== 'all') {
        orders = orders.filter(o => o.assignedHubId === filters.hubId);
      }
      if (filters?.status && filters.status !== 'all') {
        orders = orders.filter(o => o.status === filters.status);
      }
      return orders;
    }
  }

  static async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<LocalOrder> {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const applyLocalUpdate = () => {
      let updated: LocalOrder | null = null;
      StorageService.updateState(prev => {
        const order = prev.orders.find(o => o.id === orderId);
        if (!order) return prev;

        updated = {
          ...order,
          status: newStatus,
          completedAt: newStatus === 'fulfilled' || newStatus === 'cancelled' ? nowStr : order.completedAt,
        };

        let updatedInv = [...prev.inventory];
        if (order.status === 'reserved' && newStatus === 'cancelled') {
          // Release reservation
          updatedInv = updatedInv.map(i => {
            if (i.hubId === order.assignedHubId && i.sku === order.sku && i.disposition === 'sellable') {
              return {
                ...i,
                availableQuantity: i.availableQuantity + order.quantity,
                reservedQuantity: Math.max(0, i.reservedQuantity - order.quantity),
                lastUpdated: nowStr,
              };
            }
            return i;
          });
        } else if (order.status === 'reserved' && newStatus === 'fulfilled') {
          updatedInv = updatedInv.map(i => {
            if (i.hubId === order.assignedHubId && i.sku === order.sku && i.disposition === 'sellable') {
              return {
                ...i,
                totalQuantity: Math.max(0, i.totalQuantity - order.quantity),
                reservedQuantity: Math.max(0, i.reservedQuantity - order.quantity),
                lastUpdated: nowStr,
              };
            }
            return i;
          });
        }

        return {
          ...prev,
          orders: prev.orders.map(o => (o.id === orderId ? updated! : o)),
          inventory: updatedInv,
        };
      });
      return updated!;
    };

    try {
      const updated = await ApiClient.patch<LocalOrder>(`/orders/${orderId}/status`, { status: newStatus });
      applyLocalUpdate();
      return updated;
    } catch {
      return applyLocalUpdate();
    }
  }

  static async reserveOrderStock(orderId: string): Promise<LocalOrder> {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const state = StorageService.getState();
    const order = state.orders.find(o => o.id === orderId);
    if (!order) ApiClient.throwError(`Order ${orderId} not found`, 404);

    const invItem = state.inventory.find(
      i => i.hubId === order.assignedHubId && i.sku === order.sku && i.disposition === 'sellable'
    );
    if (!invItem || invItem.availableQuantity < order.quantity) {
      ApiClient.throwError(
        `Insufficient available sellable stock at ${order.hubName} to fulfill order. Available: ${invItem?.availableQuantity || 0}, Required: ${order.quantity}`,
        400
      );
    }

    const applyLocalReserve = () => {
      let updated: LocalOrder | null = null;
      StorageService.updateState(prev => {
        const updatedInv = prev.inventory.map(i => {
          if (i.hubId === order.assignedHubId && i.sku === order.sku && i.disposition === 'sellable') {
            return {
              ...i,
              availableQuantity: i.availableQuantity - order.quantity,
              reservedQuantity: i.reservedQuantity + order.quantity,
              lastUpdated: nowStr,
            };
          }
          return i;
        });

        updated = {
          ...order,
          status: 'reserved' as const,
          reservedStockId: invItem.id,
        };

        return {
          ...prev,
          inventory: updatedInv,
          orders: prev.orders.map(o => (o.id === orderId ? updated! : o)),
        };
      });
      return updated!;
    };

    try {
      const updated = await ApiClient.patch<LocalOrder>(`/orders/${orderId}/status`, { status: 'reserved' });
      applyLocalReserve();
      return updated;
    } catch {
      return applyLocalReserve();
    }
  }

  static async prepareOrder(orderId: string): Promise<LocalOrder> {
    return this.updateOrderStatus(orderId, 'prepared');
  }

  static async readyForPickup(orderId: string): Promise<LocalOrder> {
    return this.updateOrderStatus(orderId, 'ready_for_pickup');
  }

  static async markReadyForPickup(orderId: string): Promise<LocalOrder> {
    return this.readyForPickup(orderId);
  }

  static async dispatchOrder(orderId: string): Promise<LocalOrder> {
    return this.updateOrderStatus(orderId, 'dispatched');
  }

  static async fulfillOrder(orderId: string): Promise<LocalOrder> {
    return this.updateOrderStatus(orderId, 'fulfilled');
  }

  static async completeOrder(orderId: string): Promise<LocalOrder> {
    return this.fulfillOrder(orderId);
  }

  static async cancelOrder(orderId: string): Promise<LocalOrder> {
    return this.updateOrderStatus(orderId, 'cancelled');
  }
}
