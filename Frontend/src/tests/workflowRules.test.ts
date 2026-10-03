import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../services/storage';
import { ReturnService } from '../services/returnService';
import { AssessmentService } from '../services/assessmentService';
import { InspectionService } from '../services/inspectionService';
import { InventoryService } from '../services/inventoryService';
import { RecommendationService } from '../services/recommendationService';
import { TransferService } from '../services/transferService';
import { OrderService } from '../services/orderService';
import { AnalyticsService } from '../services/analyticsService';

describe('HIEN Core Domain & Business Rules Test Suite', () => {
  beforeEach(() => {
    // Reset state before each test
    StorageService.resetToDefaults();
  });

  describe('1. Return Lifecycle & Mandatory Inspection Rules', () => {
    it('blocks resale approval when a mandatory checkpoint fails', async () => {
      const state = StorageService.getState();
      const testReturn = state.returns.find(r => r.status === 'assessment_pending') || state.returns[0];

      const checks = [
        { id: 'chk-1', label: 'Physical casing integrity check', isMandatory: true, passed: true },
        { id: 'chk-2', label: 'Functional hardware power test', isMandatory: true, passed: false }, // FAILED!
        { id: 'chk-3', label: 'Packaging hygiene test', isMandatory: false, passed: true },
      ];

      await expect(
        InspectionService.recordInspection({
          returnId: testReturn.id,
          checks,
          finalDisposition: 'approved_resale',
          inspectorNotes: 'Attempting to approve despite failed functional test',
        })
      ).rejects.toMatchObject({
        status: 422,
      });

      // Verify return status was NOT promoted to approved_resale
      const afterState = StorageService.getState();
      const unchangedReturn = afterState.returns.find(r => r.id === testReturn.id);
      expect(unchangedReturn?.status).not.toBe('approved_resale');
    });

    it('approves return and automatically admits unit into hub sellable inventory when all mandatory checks pass', async () => {
      const state = StorageService.getState();
      const testReturn = state.returns.find(r => r.status === 'assessment_pending') || state.returns[0];

      const initialInv = state.inventory.find(
        i => i.hubId === testReturn.hubId && i.sku === testReturn.sku && i.disposition === 'sellable'
      );
      const initialAvailable = initialInv?.availableQuantity || 0;

      const checks = [
        { id: 'chk-1', label: 'Physical casing integrity check', isMandatory: true, passed: true },
        { id: 'chk-2', label: 'Functional hardware power test', isMandatory: true, passed: true },
        { id: 'chk-3', label: 'Packaging hygiene test', isMandatory: false, passed: true },
      ];

      const inspection = await InspectionService.recordInspection({
        returnId: testReturn.id,
        checks,
        finalDisposition: 'approved_resale',
        inspectorNotes: 'Passed all 100% mandatory checkpoints. Pristine condition.',
      });

      expect(inspection.finalDisposition).toBe('approved_resale');

      // Verify return status updated
      const updatedReturn = await ReturnService.getReturnById(testReturn.id);
      expect(updatedReturn?.status).toBe('approved_resale');

      // Verify inventory was automatically incremented at that hub!
      const afterInv = StorageService.getState().inventory.find(
        i => i.hubId === testReturn.hubId && i.sku === testReturn.sku && i.disposition === 'sellable'
      );
      expect(afterInv?.availableQuantity).toBe(initialAvailable + testReturn.quantity);
    });
  });

  describe('2. Local Order Fulfillment & Inventory Reservation', () => {
    it('reserves inventory unit and prevents double allocation', async () => {
      const state = StorageService.getState();
      const pendingOrder = state.orders.find(o => o.status === 'pending');
      expect(pendingOrder).toBeDefined();

      const invBefore = state.inventory.find(
        i => i.hubId === pendingOrder!.assignedHubId && i.sku === pendingOrder!.sku && i.disposition === 'sellable'
      );
      expect(invBefore).toBeDefined();

      const availableBefore = invBefore!.availableQuantity;
      const reservedBefore = invBefore!.reservedQuantity;

      // Reserve stock
      const updatedOrder = await OrderService.reserveOrderStock(pendingOrder!.id);
      expect(updatedOrder.status).toBe('reserved');

      // Verify inventory adjustment
      const invAfter = StorageService.getState().inventory.find(i => i.id === invBefore!.id);
      expect(invAfter?.availableQuantity).toBe(availableBefore - pendingOrder!.quantity);
      expect(invAfter?.reservedQuantity).toBe(reservedBefore + pendingOrder!.quantity);
    });

    it('releases reserved inventory back to available stock when an order is cancelled', async () => {
      const state = StorageService.getState();
      const reservedOrder = state.orders.find(o => o.status === 'reserved');
      expect(reservedOrder).toBeDefined();

      const invBefore = state.inventory.find(
        i => i.hubId === reservedOrder!.assignedHubId && i.sku === reservedOrder!.sku && i.disposition === 'sellable'
      );
      const availableBefore = invBefore!.availableQuantity;
      const reservedBefore = invBefore!.reservedQuantity;

      // Cancel order
      await OrderService.cancelOrder(reservedOrder!.id);

      // Verify released back to available
      const invAfter = StorageService.getState().inventory.find(i => i.id === invBefore!.id);
      expect(invAfter?.availableQuantity).toBe(availableBefore + reservedOrder!.quantity);
      expect(invAfter?.reservedQuantity).toBe(reservedBefore - reservedOrder!.quantity);
    });
  });

  describe('3. Transfer Corridor Feasibility, Dispatch & Discrepancies', () => {
    it('approving a recommendation creates an approved transfer and reserves source stock', async () => {
      const state = StorageService.getState();
      const proposedRec = state.recommendations.find(r => r.status === 'proposed');
      expect(proposedRec).toBeDefined();

      const sourceInvBefore = state.inventory.find(
        i => i.hubId === proposedRec!.sourceHubId && i.sku === proposedRec!.sku && i.disposition === 'sellable'
      );
      const availableBefore = sourceInvBefore!.availableQuantity;

      // Approve recommendation
      const transfer = await RecommendationService.approveRecommendation(proposedRec!.id);
      expect(transfer.status).toBe('approved');
      expect(transfer.quantity).toBe(proposedRec!.quantity);

      // Verify source stock reserved
      const sourceInvAfter = StorageService.getState().inventory.find(i => i.id === sourceInvBefore!.id);
      expect(sourceInvAfter?.availableQuantity).toBe(availableBefore - proposedRec!.quantity);
    });

    it('dispatching a transfer adjusts source and destination without duplicating available stock in-transit', async () => {
      const state = StorageService.getState();
      const approvedTransfer = state.transfers.find(t => t.status === 'approved');
      expect(approvedTransfer).toBeDefined();

      const destInvBefore = StorageService.getState().inventory.find(
        i => i.hubId === approvedTransfer!.destHubId && i.sku === approvedTransfer!.sku && i.disposition === 'sellable'
      );
      const destAvailableBefore = destInvBefore?.availableQuantity || 0;
      const destIncomingBefore = destInvBefore?.incomingQuantity || 0;

      // Dispatch
      const dispatched = await TransferService.dispatchTransfer({
        transferId: approvedTransfer!.id,
        carrierName: 'EcoExpress Pacific',
        trackingNumber: 'TRK-TEST-123',
      });
      expect(dispatched.status).toBe('in_transit');

      // Check destination: incoming increased, available is UNCHANGED while in transit!
      const destInvAfter = StorageService.getState().inventory.find(
        i => i.hubId === approvedTransfer!.destHubId && i.sku === approvedTransfer!.sku && i.disposition === 'sellable'
      );
      expect(destInvAfter?.availableQuantity).toBe(destAvailableBefore);
      expect(destInvAfter?.incomingQuantity).toBe(destIncomingBefore + approvedTransfer!.quantity);
    });

    it('receiving transfer with damaged units creates an exception and isolates units in quarantine', async () => {
      const state = StorageService.getState();
      const inTransitTransfer = state.transfers.find(t => t.status === 'in_transit');
      expect(inTransitTransfer).toBeDefined();

      // Receive with 1 damaged unit
      const received = await TransferService.receiveTransfer({
        transferId: inTransitTransfer!.id,
        receivedQty: inTransitTransfer!.quantity - 1,
        damagedQty: 1,
        missingQty: 0,
        notes: '1 unit dented during transit handling',
      });

      expect(received.status).toBe('exception');
      expect(received.receiptDetails?.damagedQty).toBe(1);

      // Verify quarantined inventory created
      const quarantinedItem = StorageService.getState().inventory.find(
        i => i.hubId === inTransitTransfer!.destHubId && i.sku === inTransitTransfer!.sku && i.disposition === 'quarantined'
      );
      expect(quarantinedItem).toBeDefined();
      expect(quarantinedItem?.totalQuantity).toBe(1);
    });
  });

  describe('4. Sustainability Analytics Calculations', () => {
    it('computes positive cost, distance, and emissions avoided compared to central warehouse baseline', async () => {
      const metrics = await AnalyticsService.getImpactMetrics();

      expect(metrics.totalReturnsProcessed).toBeGreaterThan(0);
      expect(metrics.costAvoided).toBeGreaterThan(0);
      expect(metrics.distanceAvoidedKm).toBeGreaterThan(0);
      expect(metrics.emissionsAvoidedKg).toBeGreaterThan(0);
      expect(metrics.turnaroundDaysHien).toBeLessThan(metrics.turnaroundDaysBaseline);
    });
  });
});
