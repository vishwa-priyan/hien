import { Transfer, TransferStatus } from '../types';
import { StorageService } from './storage';
import { ApiClient } from './apiClient';

export class TransferService {
  static async getTransfers(filters?: {
    status?: TransferStatus | 'all';
    sourceHubId?: string;
    destHubId?: string;
  }): Promise<Transfer[]> {
    try {
      const params: Record<string, string> = {};
      if (filters?.status && filters.status !== 'all') params.status = filters.status;
      if (filters?.sourceHubId && filters.sourceHubId !== 'all') params.hubId = filters.sourceHubId;
      if (filters?.destHubId && filters.destHubId !== 'all') params.hubId = filters.destHubId;

      const transfers = await ApiClient.get<Transfer[]>('/transfers', params);
      StorageService.updateState(prev => ({ ...prev, transfers }));
      return transfers;
    } catch {
      let transfers = StorageService.getState().transfers;
      if (filters?.status && filters.status !== 'all') {
        transfers = transfers.filter(t => t.status === filters.status);
      }
      if (filters?.sourceHubId && filters.sourceHubId !== 'all') {
        transfers = transfers.filter(t => t.sourceHubId === filters.sourceHubId);
      }
      if (filters?.destHubId && filters.destHubId !== 'all') {
        transfers = transfers.filter(t => t.destHubId === filters.destHubId);
      }
      return transfers;
    }
  }

  static async getTransferById(id: string): Promise<Transfer | null> {
    try {
      return await ApiClient.get<Transfer>(`/transfers/${id}`);
    } catch {
      const transfers = StorageService.getState().transfers;
      return transfers.find(t => t.id === id) || null;
    }
  }

  static async dispatchTransfer(params: {
    transferId: string;
    carrierName: string;
    trackingNumber: string;
    transportMethod?: string;
    dispatchNotes?: string;
  }): Promise<Transfer> {
    const state = StorageService.getState();
    const transfer = state.transfers.find(t => t.id === params.transferId);
    if (!transfer) ApiClient.throwError(`Transfer ${params.transferId} not found`, 404);

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const applyLocalDispatch = () => {
      let updatedTransfer: Transfer | null = null;
      StorageService.updateState(prev => {
        const updatedTransfers = prev.transfers.map(t => {
          if (t.id === params.transferId) {
            updatedTransfer = {
              ...t,
              status: 'in_transit' as const,
              carrierName: params.carrierName,
              trackingNumber: params.trackingNumber,
              transportMethod: params.transportMethod || t.transportMethod,
              actualDeparture: nowStr,
              events: [
                {
                  id: `ev-${Date.now()}`,
                  timestamp: nowStr,
                  status: 'Dispatched In-Transit',
                  location: t.sourceHubName,
                  description: `Dispatched via ${params.carrierName} (Tracking: ${params.trackingNumber}). ${params.dispatchNotes || ''}`,
                  actor: state.currentUser.name,
                },
                ...t.events,
              ],
            };
            return updatedTransfer;
          }
          return t;
        });

        let updatedInv = prev.inventory.map(inv => {
          if (inv.hubId === transfer!.sourceHubId && inv.sku === transfer!.sku && inv.disposition === 'sellable') {
            return {
              ...inv,
              totalQuantity: Math.max(0, inv.totalQuantity - transfer!.quantity),
              reservedQuantity: Math.max(0, inv.reservedQuantity - transfer!.quantity),
              lastUpdated: nowStr,
            };
          }
          return inv;
        });

        // Destination incoming quantity
        const destInv = updatedInv.find(
          inv => inv.hubId === transfer!.destHubId && inv.sku === transfer!.sku && inv.disposition === 'sellable'
        );
        if (destInv) {
          updatedInv = updatedInv.map(inv =>
            inv.id === destInv.id
              ? { ...inv, incomingQuantity: inv.incomingQuantity + transfer!.quantity, lastUpdated: nowStr }
              : inv
          );
        }

        return {
          ...prev,
          transfers: updatedTransfers,
          inventory: updatedInv,
        };
      });
      return updatedTransfer!;
    };

    try {
      await ApiClient.post<Transfer>(`/transfers/${params.transferId}/dispatch`, {
        carrierName: params.carrierName,
        trackingNumber: params.trackingNumber,
        actor: state.currentUser.name,
      });
      return applyLocalDispatch();
    } catch {
      return applyLocalDispatch();
    }
  }

  static async receiveTransfer(params: {
    transferId: string;
    receivedQty: number;
    damagedQty: number;
    missingQty: number;
    notes?: string;
  }): Promise<Transfer> {
    const state = StorageService.getState();
    const transfer = state.transfers.find(t => t.id === params.transferId);
    if (!transfer) ApiClient.throwError(`Transfer ${params.transferId} not found`, 404);

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newStatus: TransferStatus = params.damagedQty > 0 || params.missingQty > 0 ? 'exception' : 'received';

    const applyLocalReceive = () => {
      let updatedTransfer: Transfer | null = null;
      StorageService.updateState(prev => {
        const updatedTransfers = prev.transfers.map(t => {
          if (t.id === params.transferId) {
            updatedTransfer = {
              ...t,
              status: newStatus,
              actualArrival: nowStr,
              receiptDetails: {
                receivedQty: params.receivedQty,
                damagedQty: params.damagedQty,
                missingQty: params.missingQty,
                notes: params.notes,
                receivedAt: nowStr,
                inspectorName: state.currentUser.name,
              },
              events: [
                {
                  id: `ev-${Date.now()}`,
                  timestamp: nowStr,
                  status: newStatus === 'exception' ? 'Exception: Inspection Discrepancy' : 'Delivery Received',
                  location: t.destHubName,
                  description: `Received ${params.receivedQty} intact units (Damaged: ${params.damagedQty}, Missing: ${params.missingQty}). ${params.notes || ''}`,
                  actor: state.currentUser.name,
                },
                ...t.events,
              ],
            };
            return updatedTransfer;
          }
          return t;
        });

        // Update destination inventory
        let updatedInv = prev.inventory.map(inv => {
          if (inv.hubId === transfer!.destHubId && inv.sku === transfer!.sku && inv.disposition === 'sellable') {
            return {
              ...inv,
              totalQuantity: inv.totalQuantity + params.receivedQty,
              availableQuantity: inv.availableQuantity + params.receivedQty,
              incomingQuantity: Math.max(0, inv.incomingQuantity - transfer!.quantity),
              lastUpdated: nowStr,
            };
          }
          return inv;
        });

        // If damaged units exist, quarantine them
        if (params.damagedQty > 0) {
          const quarInv = updatedInv.find(
            inv => inv.hubId === transfer!.destHubId && inv.sku === transfer!.sku && inv.disposition === 'quarantined'
          );
          if (quarInv) {
            updatedInv = updatedInv.map(inv =>
              inv.id === quarInv.id
                ? {
                    ...inv,
                    totalQuantity: inv.totalQuantity + params.damagedQty,
                    availableQuantity: inv.availableQuantity + params.damagedQty,
                    lastUpdated: nowStr,
                  }
                : inv
            );
          } else {
            updatedInv.push({
              id: `inv-quar-${Date.now()}`,
              sku: transfer!.sku,
              productName: transfer!.productName,
              category: 'General Goods',
              variant: 'Damaged in transit',
              hubId: transfer!.destHubId,
              hubName: transfer!.destHubName,
              totalQuantity: params.damagedQty,
              availableQuantity: params.damagedQty,
              reservedQuantity: 0,
              incomingQuantity: 0,
              targetStock: 0,
              forecastDemand: 0,
              disposition: 'quarantined',
              storageLocation: 'Quarantine Staging Bay Q-1',
              unitCost: 0,
              sellingPrice: 0,
              lastUpdated: nowStr,
            });
          }
        }

        return {
          ...prev,
          transfers: updatedTransfers,
          inventory: updatedInv,
        };
      });
      return updatedTransfer!;
    };

    try {
      await ApiClient.post<Transfer>(`/transfers/${params.transferId}/receive`, {
        receivedQty: params.receivedQty,
        damagedQty: params.damagedQty,
        missingQty: params.missingQty,
        notes: params.notes,
        inspectorName: state.currentUser.name,
      });
      return applyLocalReceive();
    } catch {
      return applyLocalReceive();
    }
  }
}
