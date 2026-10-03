import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransferService } from '../../services/transferService';
import { Transfer } from '../../types';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { Modal } from '../../components/common/Modal';
import { Input, Select } from '../../components/common/Input';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Truck, ArrowRight, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const TransferDispatchPage: React.FC = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  // Form states
  const [carrierName, setCarrierName] = useState('EcoExpress Pacific');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [transportMethod, setTransportMethod] = useState('Electric Delivery Van');
  const [dispatchNotes, setDispatchNotes] = useState('Sealed manifest crate inspected.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    setIsLoading(true);
    const data = await TransferService.getTransfers({ status: 'approved' });
    setTransfers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDispatchModal = (t: Transfer) => {
    setSelectedTransfer(t);
    setTrackingNumber(`TRK-WA-${Math.floor(10000 + Math.random() * 90000)}`);
    setDispatchNotes(`Manifest batch inspected at ${t.sourceHubName}. Tamper seal verified.`);
  };

  const handleExecuteDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;
    setIsSubmitting(true);

    try {
      const updated = await TransferService.dispatchTransfer({
        transferId: selectedTransfer.id,
        carrierName,
        trackingNumber,
        transportMethod,
        dispatchNotes,
      });

      showToast({
        title: 'Transfer Dispatched',
        description: `${updated.transferCode} is now in-transit with ${carrierName}.`,
        type: 'success',
      });

      setSelectedTransfer(null);
      await loadData();
      navigate(`/hub/transfers/${updated.id}`);
    } catch (err: any) {
      showToast({ title: 'Dispatch Failed', description: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Transfer>[] = [
    {
      key: 'code',
      header: 'Transfer Code',
      sortable: true,
      render: t => <span className="font-mono font-bold text-slate-900">{t.transferCode}</span>,
    },
    {
      key: 'route',
      header: 'Route Corridor',
      render: t => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800">{t.sourceHubName}</span>
          <span className="text-slate-400 mx-1.5">&rarr;</span>
          <span className="font-semibold text-slate-800">{t.destHubName}</span>
          <span className="text-slate-400 text-[10px] ml-2 font-mono">{t.distanceKm} km</span>
        </div>
      ),
    },
    {
      key: 'payload',
      header: 'Manifest Payload',
      render: t => (
        <div>
          <span className="font-medium text-slate-900 block">{t.productName}</span>
          <span className="text-xs font-mono font-bold text-blue-700">{t.quantity} unit(s) &bull; {t.sku}</span>
        </div>
      ),
    },
    {
      key: 'departure',
      header: 'Planned Departure',
      render: t => <span className="text-slate-600 font-mono text-xs">{t.plannedDeparture}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: t => <StatusBadge status={t.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: t => (
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Truck className="w-3.5 h-3.5" />}
          onClick={() => openDispatchModal(t)}
        >
          Assign & Dispatch
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Pending Transfer Dispatch Bay
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Approved inventory transfers ready for carrier vehicle allocation, tracking generation, and outbound dispatch.
          </p>
        </div>
      </div>

      <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Dispatch Authorization Guard: </span>
          Only transfers with prior hub manager approval and reserved source stock can be dispatched. Once dispatched, stock is deducted from source reserved inventory and designated as incoming at the receiving facility without duplication.
        </div>
      </div>

      <Table
        columns={columns}
        data={transfers}
        keyExtractor={t => t.id}
        isLoading={isLoading}
        searchKeys={['transferCode', 'productName', 'sourceHubName', 'destHubName']}
        searchPlaceholder="Search pending dispatch transfers..."
        pageSize={8}
        emptyTitle="No Transfers Awaiting Dispatch"
        emptyDescription="All approved transfers have been successfully dispatched or no new transfers are scheduled."
      />

      {/* Dispatch Modal */}
      <Modal
        isOpen={Boolean(selectedTransfer)}
        onClose={() => setSelectedTransfer(null)}
        title={selectedTransfer ? `Dispatch ${selectedTransfer.transferCode}` : ''}
        description={`Allocate transport vehicle for ${selectedTransfer?.quantity} unit(s) of ${selectedTransfer?.productName}.`}
      >
        <form onSubmit={handleExecuteDispatch} className="space-y-4">
          <Select
            label="Designated Transport Carrier *"
            value={carrierName}
            onChange={e => setCarrierName(e.target.value)}
            options={[
              { value: 'EcoExpress Pacific', label: 'EcoExpress Pacific (EV Van Fleet)' },
              { value: 'SoundTransit Green Logistics', label: 'SoundTransit Green Logistics (Dedicated Shuttle)' },
              { value: 'Cascade Hyperlocal Couriers', label: 'Cascade Hyperlocal Couriers (Same-Day)' },
              { value: 'InterCity Freight Link', label: 'InterCity Freight Link (Pallet Transport)' },
            ]}
          />

          <Input
            label="Generated Tracking Number *"
            required
            value={trackingNumber}
            onChange={e => setTrackingNumber(e.target.value)}
          />

          <Select
            label="Transport Vehicle Method *"
            value={transportMethod}
            onChange={e => setTransportMethod(e.target.value)}
            options={[
              { value: 'Electric Delivery Van', label: 'Electric Delivery Van (Zero Direct Emissions)' },
              { value: 'Dedicated Regional Shuttle', label: 'Dedicated Regional Shuttle' },
              { value: 'Local Courier Partner', label: 'Local Courier Partner' },
            ]}
          />

          <Input
            label="Dispatch & Crate Seal Notes"
            value={dispatchNotes}
            onChange={e => setDispatchNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setSelectedTransfer(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Confirm Dispatch & Release
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
