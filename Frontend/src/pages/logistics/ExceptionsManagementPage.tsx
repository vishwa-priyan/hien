import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransferService } from '../../services/transferService';
import { Transfer } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Table, Column } from '../../components/common/Table';
import { Modal } from '../../components/common/Modal';
import { AlertTriangle, ShieldAlert, CheckCircle2, Eye, FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const ExceptionsManagementPage: React.FC = () => {
  const [exceptions, setExceptions] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEx, setSelectedEx] = useState<Transfer | null>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    setIsLoading(true);
    const data = await TransferService.getTransfers({ status: 'exception' });
    setExceptions(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolveException = () => {
    if (!selectedEx) return;
    showToast({
      title: 'Exception Case Resolved',
      description: `Discrepancy for ${selectedEx.transferCode} acknowledged. Damaged units slated for salvage triage.`,
      type: 'success',
    });
    setSelectedEx(null);
  };

  const columns: Column<Transfer>[] = [
    {
      key: 'code',
      header: 'Transfer Code',
      sortable: true,
      render: t => <span className="font-mono font-bold text-red-700">{t.transferCode}</span>,
    },
    {
      key: 'corridor',
      header: 'Route Corridor',
      render: t => (
        <div className="text-xs">
          <span>{t.sourceHubName} &rarr; {t.destHubName}</span>
        </div>
      ),
    },
    {
      key: 'payload',
      header: 'Manifest Item',
      render: t => <span>{t.quantity}x {t.productName}</span>,
    },
    {
      key: 'discrepancy',
      header: 'Discrepancy Breakdown',
      render: t => {
        const rd = t.receiptDetails;
        if (!rd) return <span className="text-slate-400">Under review</span>;
        return (
          <div className="text-xs">
            <span className="text-emerald-700 font-semibold">{rd.receivedQty} Good</span> &bull;{' '}
            <span className="text-red-700 font-bold">{rd.damagedQty} Damaged</span> &bull;{' '}
            <span className="text-amber-700 font-bold">{rd.missingQty} Missing</span>
          </div>
        );
      },
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
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedEx(t)}
            leftIcon={<FileText className="w-3.5 h-3.5" />}
          >
            Review Case
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/hub/transfers/${t.id}`)}
          >
            Details
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Logistics Exceptions & Discrepancies
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit files for transit damage, manifest discrepancies, and carrier delivery issues.
          </p>
        </div>
      </div>

      <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-xl text-xs text-red-950 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Automated Quarantine Enforcement: </span>
          When receiving officers record transit damage or missing units, the transfer status is automatically elevated to "Exception". Damaged units are isolated into dedicated quarantine staging to prevent accidental resale or order allocation.
        </div>
      </div>

      <Table
        columns={columns}
        data={exceptions}
        keyExtractor={t => t.id}
        isLoading={isLoading}
        searchKeys={['transferCode', 'productName', 'sourceHubName', 'destHubName']}
        searchPlaceholder="Filter exceptions by code, product, or hub..."
        pageSize={8}
        emptyTitle="No Open Discrepancy Exceptions"
        emptyDescription="All corridor transfers have been cleanly received without transit damage or missing items."
      />

      {/* Exception Review Modal */}
      <Modal
        isOpen={Boolean(selectedEx)}
        onClose={() => setSelectedEx(null)}
        title={selectedEx ? `Exception File: ${selectedEx.transferCode}` : ''}
        description="Review transit discrepancy investigation details."
      >
        {selectedEx && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-red-900">
              <strong className="block text-[11px] uppercase font-bold">Exception Notice:</strong>
              <p className="mt-0.5">{selectedEx.exceptionReason || 'Discrepancy detected at receiving dock.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Source Hub</span>
                <span className="font-semibold text-slate-900">{selectedEx.sourceHubName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Destination Hub</span>
                <span className="font-semibold text-slate-900">{selectedEx.destHubName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Manifest Item</span>
                <span className="font-semibold text-slate-900">{selectedEx.productName} ({selectedEx.quantity} units)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Carrier</span>
                <span className="font-semibold text-slate-900">{selectedEx.carrierName || 'TBD'}</span>
              </div>
            </div>

            {selectedEx.receiptDetails && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                <strong className="block mb-1">Receiving Inspector Remarks:</strong>
                <p className="italic">"{selectedEx.receiptDetails.notes}"</p>
                <div className="text-[10px] text-slate-400 mt-2">
                  Recorded by {selectedEx.receiptDetails.inspectorName} on {selectedEx.receiptDetails.receivedAt}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedEx(null)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={handleResolveException}>
                Acknowledge & Close Exception File
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
