import { TransferRecommendation, Transfer } from '../types';
import { StorageService } from './storage';
import { ApiClient } from './apiClient';

export class RecommendationService {
  static async getRecommendations(): Promise<TransferRecommendation[]> {
    try {
      const recs = await ApiClient.get<TransferRecommendation[]>('/recommendations');
      StorageService.updateState(prev => ({ ...prev, recommendations: recs }));
      return recs;
    } catch {
      return StorageService.getState().recommendations;
    }
  }

  static async generateRecommendations(): Promise<TransferRecommendation[]> {
    try {
      const recs = await ApiClient.post<TransferRecommendation[]>('/recommendations/generate');
      StorageService.updateState(prev => ({
        ...prev,
        recommendations: [...recs, ...prev.recommendations],
      }));
      return recs;
    } catch {
      return StorageService.getState().recommendations;
    }
  }

  static async recalculateRecommendations(): Promise<TransferRecommendation[]> {
    return this.generateRecommendations();
  }

  static async approveRecommendation(id: string): Promise<Transfer> {
    const state = StorageService.getState();
    const rec = state.recommendations.find(r => r.id === id);
    if (!rec) ApiClient.throwError(`Recommendation ${id} not found`, 404);

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const applyLocalApproval = (tr?: Transfer) => {
      const newTransfer: Transfer = tr || {
        id: `tr-${Date.now().toString().slice(-4)}`,
        transferCode: `TR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        sourceHubId: rec!.sourceHubId,
        sourceHubName: rec!.sourceHubName,
        destHubId: rec!.destHubId,
        destHubName: rec!.destHubName,
        sku: rec!.sku,
        productName: rec!.productName,
        quantity: rec!.quantity,
        status: 'approved',
        transportMethod: 'Local Green Courier Fleet',
        plannedDeparture: nowStr,
        estimatedArrival: nowStr,
        distanceKm: rec!.distanceKm,
        transportCost: rec!.estTransportCost,
        emissionsKg: rec!.estEmissionsKg,
        createdAt: nowStr,
        events: [],
      };

      StorageService.updateState(prev => {
        const updatedRecs = prev.recommendations.map(r =>
          r.id === id ? { ...r, status: 'approved' as const } : r
        );

        const updatedInv = prev.inventory.map(inv => {
          if (inv.hubId === rec!.sourceHubId && inv.sku === rec!.sku && inv.disposition === 'sellable') {
            return {
              ...inv,
              availableQuantity: inv.availableQuantity - rec!.quantity,
              reservedQuantity: inv.reservedQuantity + rec!.quantity,
              lastUpdated: nowStr,
            };
          }
          return inv;
        });

        return {
          ...prev,
          recommendations: updatedRecs,
          transfers: [newTransfer, ...prev.transfers.filter(t => t.id !== newTransfer.id)],
          inventory: updatedInv,
        };
      });

      return newTransfer;
    };

    try {
      const resp = await ApiClient.post<{ recommendation: TransferRecommendation; createdTransferId: string; transferCode: string }>(
        `/recommendations/${id}/approve`
      );
      const transfers = await ApiClient.get<Transfer[]>('/transfers');
      const created = transfers.find(t => t.id === resp.createdTransferId);
      return applyLocalApproval(created);
    } catch {
      return applyLocalApproval();
    }
  }

  static async rejectRecommendation(id: string, reason: string): Promise<void> {
    try {
      await ApiClient.post(`/recommendations/${id}/reject`, { reason });
    } catch {
      // ignore
    }
    StorageService.updateState(prev => ({
      ...prev,
      recommendations: prev.recommendations.map(r =>
        r.id === id ? { ...r, status: 'rejected' as const, rejectionReason: reason } : r
      ),
    }));
  }
}
