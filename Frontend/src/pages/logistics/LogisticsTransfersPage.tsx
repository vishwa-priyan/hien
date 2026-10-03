import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransferService } from '../../services/transferService';
import { Transfer } from '../../types';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Truck, MapPin, Eye, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';

export const LogisticsTransfersPage: React.FC = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    TransferService.getTransfers().then(data => {
      setTransfers(data.filter(t => t.status === 'in_transit' || t.status === 'approved'));
      setIsLoading(false);
    });
  }, []);

  const columns: Column<Transfer>[] = [
    {
      key: 'code',
      header: 'Transfer Code',
      sortable: true,
      render: t => (
        <div>
          <span className="font-mono font-bold text-slate-900 block">{t.transferCode}</span>
          <span className="text-[10px] text-slate-400 font-mono">{t.trackingNumber || 'Pending'}</span>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Route Corridor',
      render: t => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800">{t.sourceHubName}</span>
          <span className="text-slate-400 mx-1.5">&rarr;</span>
          <span className="font-semibold text-slate-800">{t.destHubName}</span>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.distanceKm} km &bull; {t.transportMethod}</div>
        </div>
      ),
    },
    {
      key: 'payload',
      header: 'Payload',
      render: t => (
        <div>
          <span className="font-medium text-slate-900 block truncate max-w-xs">{t.productName}</span>
          <span className="text-xs font-mono font-bold text-blue-700">{t.quantity} unit(s)</span>
        </div>
      ),
    },
    {
      key: 'carrier',
      header: 'Carrier',
      render: t => <span className="text-slate-700">{t.carrierName || 'TBD'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: t => <StatusBadge status={t.status} />,
    },
    {
      key: 'eta',
      header: 'ETA',
      sortable: true,
      render: t => (
        <div className="text-xs">
          <span className="font-bold text-teal-700">{t.estimatedArrival.slice(11, 16)}</span>
          <span className="text-[10px] text-slate-400 block">{t.estimatedArrival.slice(0, 10)}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: t => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/hub/transfers/${t.id}`)}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
        >
          Track Live
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Active Corridor Transfers & Tracking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Simulated in-transit telemetry across Puget Sound hyperlocal transfer lanes.
          </p>
        </div>
      </div>

      <Table
        columns={columns}
        data={transfers}
        keyExtractor={t => t.id}
        isLoading={isLoading}
        searchKeys={['transferCode', 'productName', 'sourceHubName', 'destHubName', 'carrierName']}
        searchPlaceholder="Search active transfers..."
        pageSize={8}
        emptyTitle="No Active In-Transit Transfers"
        emptyDescription="All corridor shipments are currently checked in or awaiting carrier dispatch."
        onRowClick={t => navigate(`/hub/transfers/${t.id}`)}
      />
    </div>
  );
};
