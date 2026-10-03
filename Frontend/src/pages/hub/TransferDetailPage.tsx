import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TransferService } from '../../services/transferService';
import { Transfer } from '../../types';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  ArrowLeft,
  Truck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  MapPin,
  Package,
  ShieldAlert,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const TransferDetailPage: React.FC = () => {
  const { transferId } = useParams<{ transferId: string }>();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Dispatch Modal state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [carrierName, setCarrierName] = useState('EcoExpress Logistics');
  const [trackingNumber, setTrackingNumber] = useState(`TRK-WA-${Math.floor(10000 + Math.random() * 90000)}`);
  const [dispatchNotes, setDispatchNotes] = useState('Sealed in security tote #WA-44');

  // Receipt Modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receivedQty, setReceivedQty] = useState('0');
  const [damagedQty, setDamagedQty] = useState('0');
  const [missingQty, setMissingQty] = useState('0');
  const [receiptNotes, setReceiptNotes] = useState('Received at destination intake dock.');

  const loadData = async () => {
    if (transferId) {
      const data = await TransferService.getTransferById(transferId);
      setTransfer(data);
      if (data) {
        setReceivedQty(String(data.quantity));
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [transferId]);

  const handleConfirmDispatch = async () => {
    if (!transfer) return;
    try {
      const updated = await TransferService.dispatchTransfer({
        transferId: transfer.id,
        carrierName,
        trackingNumber,
        dispatchNotes,
      });
      setTransfer(updated);
      setIsDispatchModalOpen(false);
      showToast({
        title: 'Transfer Dispatched',
        description: `${updated.quantity} units in-transit via ${carrierName}.`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({ title: 'Dispatch Error', description: err.message, type: 'error' });
    }
  };

  const handleConfirmReceipt = async () => {
    if (!transfer) return;
    const rQty = parseInt(receivedQty, 10) || 0;
    const dQty = parseInt(damagedQty, 10) || 0;
    const mQty = parseInt(missingQty, 10) || 0;

    if (rQty + dQty + mQty !== transfer.quantity) {
      showToast({
        title: 'Quantity Mismatch',
        description: `Sum of received (${rQty}), damaged (${dQty}), and missing (${mQty}) must equal manifest total (${transfer.quantity}).`,
        type: 'error',
      });
      return;
    }

    try {
      const updated = await TransferService.receiveTransfer({
        transferId: transfer.id,
        receivedQty: rQty,
        damagedQty: dQty,
        missingQty: mQty,
        notes: receiptNotes,
      });
      setTransfer(updated);
      setIsReceiptModalOpen(false);
      showToast({
        title: dQty > 0 || mQty > 0 ? 'Receipt Discrepancy Logged' : 'Transfer Received',
        description: dQty > 0 || mQty > 0
          ? 'Exception record created. Damaged units isolated in quarantine.'
          : `${rQty} units successfully admitted into destination stock!`,
        type: dQty > 0 || mQty > 0 ? 'warning' : 'success',
      });
    } catch (err: any) {
      showToast({ title: 'Receipt Error', description: err.message, type: 'error' });
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading transfer details...</div>;
  }

  if (!transfer) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-bold text-slate-900">Transfer record not found</h2>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/hub/transfers')}>
          Back to Transfers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/hub/transfers')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Transfers
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {transfer.transferCode}
              </h1>
              <StatusBadge status={transfer.status} />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Carrier: {transfer.carrierName || 'TBD'} &bull; Tracking: {transfer.trackingNumber || 'Unassigned'}
            </p>
          </div>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="flex items-center gap-2">
          {transfer.status === 'approved' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Truck className="w-4 h-4" />}
              onClick={() => setIsDispatchModalOpen(true)}
            >
              Dispatch Transfer
            </Button>
          )}

          {(transfer.status === 'in_transit' || transfer.status === 'approved') && (
            <Button
              variant="success"
              size="sm"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => setIsReceiptModalOpen(true)}
            >
              Confirm Check-in & Receipt
            </Button>
          )}
        </div>
      </div>

      {/* Exception banner if exception occurred */}
      {transfer.exceptionReason && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-950 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-red-900">Receipt Discrepancy Exception File</h4>
            <p className="mt-0.5 leading-relaxed">{transfer.exceptionReason}</p>
          </div>
        </div>
      )}

      {/* Route & Manifest Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Corridor Visualization */}
          <Card>
            <CardHeader title="Corridor Routing & Freight Information" />
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Origin Dispatch Hub</span>
                  <span className="font-bold text-slate-900 text-sm block mt-0.5">{transfer.sourceHubName}</span>
                </div>

                <div className="flex flex-col items-center justify-center px-4">
                  <span className="text-xs font-bold text-slate-900 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-2xs">
                    {transfer.quantity} unit(s)
                  </span>
                  <div className="w-32 border-t-2 border-dashed border-slate-300 relative my-2">
                    <ArrowRight className="w-4 h-4 text-slate-400 absolute right-0 -top-2" />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{transfer.distanceKm} km</span>
                </div>

                <div className="flex-1 sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Destination Receiving Hub</span>
                  <span className="font-bold text-slate-900 text-sm block mt-0.5">{transfer.destHubName}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Transport Method</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{transfer.transportMethod}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Freight Cost</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">${transfer.transportCost.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-950">
                  <span className="block text-[10px] uppercase font-bold">Carbon Footprint</span>
                  <span className="font-bold mt-0.5 block">{transfer.emissionsKg} kg CO₂e</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manifest Item Card */}
          <Card>
            <CardHeader title="Manifest Item Breakdown" />
            <CardContent>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{transfer.productName}</h4>
                  <span className="font-mono text-blue-700 font-semibold">{transfer.sku}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block">Transfer Quantity</span>
                  <span className="text-lg font-bold text-slate-900">{transfer.quantity} units</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipt details card if received */}
          {transfer.receiptDetails && (
            <Card className="border-teal-200 bg-teal-50/20">
              <CardHeader title="Receipt Inspection Check-In Summary" />
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2.5 bg-white rounded-lg border border-teal-200 text-center">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Good Units Admitted</span>
                    <span className="text-base font-bold text-emerald-700">{transfer.receiptDetails.receivedQty}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-red-200 text-center">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Damaged in Transit</span>
                    <span className="text-base font-bold text-red-700">{transfer.receiptDetails.damagedQty}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-amber-200 text-center">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Missing Manifest</span>
                    <span className="text-base font-bold text-amber-700">{transfer.receiptDetails.missingQty}</span>
                  </div>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-600">
                  <strong>Notes: </strong>{transfer.receiptDetails.notes || 'Normal check-in'}
                  <div className="text-[10px] text-slate-400 mt-1">
                    Recorded by {transfer.receiptDetails.inspectorName} on {transfer.receiptDetails.receivedAt}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Tracking Timeline */}
        <Card>
          <CardHeader title="Corridor Event Log" subtitle="Simulated tracking milestones" />
          <CardContent>
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-200">
              {transfer.events.map((ev, idx) => (
                <div key={idx} className="relative flex items-start gap-3 pl-6 text-xs">
                  <span className="absolute left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                  <div>
                    <p className="font-bold text-slate-900">{ev.status}</p>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{ev.description}</p>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <span>{ev.timestamp}</span> &bull; <span>{ev.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dispatch Modal */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title="Dispatch Inventory Transfer"
        description={`Hand over ${transfer.quantity} units to carrier for road transit.`}
      >
        <div className="space-y-4">
          <Input
            label="Logistics Carrier Name *"
            required
            value={carrierName}
            onChange={e => setCarrierName(e.target.value)}
          />

          <Input
            label="Waybill / Tracking Reference *"
            required
            value={trackingNumber}
            onChange={e => setTrackingNumber(e.target.value)}
          />

          <Input
            label="Dispatch & Security Seal Notes"
            value={dispatchNotes}
            onChange={e => setDispatchNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsDispatchModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmDispatch}>
              Confirm Dispatch
            </Button>
          </div>
        </div>
      </Modal>

      {/* Receipt & Discrepancy Reporting Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Confirm Arrival & Physical Receipt"
        description={`Record physical check-in count for transfer manifest (${transfer.quantity} total units).`}
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Good Condition Units *"
              required
              type="number"
              min="0"
              value={receivedQty}
              onChange={e => setReceivedQty(e.target.value)}
            />
            <Input
              label="Damaged in Transit"
              type="number"
              min="0"
              value={damagedQty}
              onChange={e => setDamagedQty(e.target.value)}
            />
            <Input
              label="Missing Units"
              type="number"
              min="0"
              value={missingQty}
              onChange={e => setMissingQty(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receiving Notes & Discrepancy Remarks
            </label>
            <textarea
              rows={3}
              value={receiptNotes}
              onChange={e => setReceiptNotes(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="e.g. Outer cardboard crate showed tear on seal; all units inspected inside."
            />
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
            <strong>Rule:</strong> Any damaged units recorded will automatically create a freight discrepancy exception and route units to the quarantine staging area. Good units will enter sellable stock.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsReceiptModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="success" size="sm" onClick={handleConfirmReceipt}>
              Submit Receipt Check-In
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
