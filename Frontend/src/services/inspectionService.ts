import { PhysicalInspection, ReturnStatus, InspectionCheckItem } from '../types';
import { StorageService } from './storage';
import { ApiClient } from './apiClient';

export class InspectionService {
  static async recordInspection(params: {
    returnId: string;
    checks: InspectionCheckItem[];
    finalDisposition: 'approved_resale' | 'refurbishment_required' | 'not_suitable' | 'quarantined';
    inspectorNotes: string;
    evidenceImageUrl?: string;
  }): Promise<PhysicalInspection> {
    const state = StorageService.getState();
    const ret = state.returns.find(r => r.id === params.returnId);

    // Business check: If mandatory check failed, block approval
    const failedMandatory = params.checks.filter(c => c.isMandatory && c.passed !== true);
    if (params.finalDisposition === 'approved_resale' && failedMandatory.length > 0) {
      const failedLabels = failedMandatory.map(c => c.label).join(', ');
      ApiClient.throwError(
        `Cannot approve for resale: Mandatory inspection checks failed or incomplete (${failedLabels}). Business rule requires 100% pass on mandatory checks.`,
        422
      );
    }

    const payload = {
      returnId: params.returnId,
      inspectorId: state.currentUser.id,
      inspectorName: state.currentUser.name,
      checks: params.checks,
      finalDisposition: params.finalDisposition,
      inspectorNotes: params.inspectorNotes,
      evidenceImageUrl: params.evidenceImageUrl,
    };

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const applyLocalMutation = (inspection: PhysicalInspection) => {
      StorageService.updateState(prev => {
        const updatedReturns = prev.returns.map(r =>
          r.id === params.returnId
            ? {
                ...r,
                status: params.finalDisposition as ReturnStatus,
                inspection,
                updatedAt: nowStr,
              }
            : r
        );

        let updatedInventory = [...prev.inventory];
        if (params.finalDisposition === 'approved_resale' && ret) {
          const existingInv = updatedInventory.find(
            inv => inv.hubId === ret.hubId && inv.sku === ret.sku && inv.disposition === 'sellable'
          );
          if (existingInv) {
            updatedInventory = updatedInventory.map(inv =>
              inv.id === existingInv.id
                ? {
                    ...inv,
                    totalQuantity: inv.totalQuantity + ret.quantity,
                    availableQuantity: inv.availableQuantity + ret.quantity,
                    lastUpdated: nowStr,
                  }
                : inv
            );
          }
        }

        return {
          ...prev,
          returns: updatedReturns,
          inventory: updatedInventory,
        };
      });
    };

    try {
      const inspection = await ApiClient.post<PhysicalInspection>('/inspections', payload);
      applyLocalMutation(inspection);
      return inspection;
    } catch {
      const inspection: PhysicalInspection = {
        id: `insp-${Date.now()}`,
        returnId: params.returnId,
        inspectorId: state.currentUser.id,
        inspectorName: state.currentUser.name,
        completedAt: nowStr,
        checks: params.checks,
        finalDisposition: params.finalDisposition,
        inspectorNotes: params.inspectorNotes,
        evidenceImageUrl: params.evidenceImageUrl,
      };
      applyLocalMutation(inspection);
      return inspection;
    }
  }
}
