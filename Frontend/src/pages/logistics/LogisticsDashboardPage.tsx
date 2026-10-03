import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransferService } from '../../services/transferService';
import { StorageService } from '../../services/storage';
import { Transfer } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { StatusBadge } from '../../components/common/Badge';
import {
  Truck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Navigation,
  Compass,
  DollarSign,
  Leaf,
  Eye,
} from 'lucide-react';

export const LogisticsDashboardPage: React.FC = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    TransferService.getTransfers().then(data => {
      setTransfers(data);
      setIsLoading(false);
    });
  }, []);

  const awaitingDispatch = transfers.filter(t => t.status === 'approved').length;
  const inTransit = transfers.filter(t => t.status === 'in_transit').length;
  const completedTransfers = transfers.filter(t => t.status === 'received').length;
  const exceptions = transfers.filter(t => t.status === 'exception').length;

  const totalDistanceKm = transfers.reduce((sum, t) => sum + (t.distanceKm || 0), 0);
  const totalTransportCost = transfers.reduce((sum, t) => sum + (t.transportCost || 0), 0);
  const totalEmissionsKg = transfers.reduce((sum, t) => sum + (t.emissionsKg || 0), 0);

  const activeMovements = transfers.filter(
    t => t.status === 'in_transit' || t.status === 'approved' || t.status === 'exception'
  );

  const columns: Column<Transfer>[] = [
    {
      key: 'code',
      header: 'Transfer Reference',
      sortable: true,
      render: t => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block">{t.transferCode}</span>
          <span className="text-[10px] text-slate-400 font-mono">{t.carrierName || 'TBD'}</span>
        </div>
      ),
    },
    {
      key: 'corridor',
      header: 'Corridor Route',
      render: t => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800">{t.sourceHubName.split(' ')[0]}</span>
          <span className="text-slate-400 mx-1.5">&rarr;</span>
          <span className="font-semibold text-slate-800">{t.destHubName.split(' ')[0]}</span>
          <span className="text-slate-400 text-[10px] ml-2">({t.distanceKm} km)</span>
        </div>
      ),
    },
    {
      key: 'manifest',
      header: 'Manifest Payload',
      sortable: true,
      render: t => <span>{t.quantity}x {t.productName}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: t => <StatusBadge status={t.status} />,
    },
    {
      key: 'eta',
      header: 'Est. Arrival',
      render: t => <span className="font-mono text-xs text-slate-700">{t.estimatedArrival.slice(11, 16)}</span>,
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
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Logistics Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Dispatch coordination, carrier fleet tracking, transit ETA monitoring, and discrepancy exception handling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Truck className="w-4 h-4" />}
            onClick={() => navigate('/logistics/dispatch')}
          >
            Dispatch Pending Fleet
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Awaiting Dispatch"
          value={awaitingDispatch}
          subtitle="Approved at source"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="In-Transit Active"
          value={inTransit}
          subtitle="On road"
          icon={Truck}
          color="blue"
        />
        <StatCard
          title="Delivered & Restocked"
          value={completedTransfers}
          subtitle="Completed"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Route Exceptions"
          value={exceptions}
          subtitle="Discrepancy logged"
          icon={AlertTriangle}
          color="slate"
        />
        <StatCard
          title="Total Road Distance"
          value={`${totalDistanceKm.toFixed(0)} km`}
          subtitle="Network transfer sum"
          icon={Compass}
          color="teal"
        />
        <StatCard
          title="Transport Cost"
          value={`$${totalTransportCost.toFixed(0)}`}
          subtitle="Dedicated courier"
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Active Corridor Movements */}
      <Card>
        <CardHeader
          title="Active Corridor Freight Movements"
          subtitle="Transfers currently being prepped, in-transit, or flagged for inspection discrepancies"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/logistics/exceptions')}
            >
              View Exceptions Queue ({exceptions})
            </Button>
          }
        />
        <Table
          columns={columns}
          data={activeMovements}
          keyExtractor={t => t.id}
          isLoading={isLoading}
          pageSize={6}
          onRowClick={t => navigate(`/hub/transfers/${t.id}`)}
        />
      </Card>
    </div>
  );
};
