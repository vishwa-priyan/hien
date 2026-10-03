import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TransferService } from '../../services/transferService';
import { StorageService } from '../../services/storage';
import { Transfer, TransferStatus } from '../../types';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { ArrowRightLeft, Truck, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';

export const TransferManagementPage: React.FC = () => {
  const { currentHub, allHubs } = useAuth();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  const activeHubId = currentHub?.id || allHubs[0]?.id;

  const loadData = async () => {
    setIsLoading(true);
    const data = await TransferService.getTransfers();
    setTransfers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTransfers = transfers.filter(t => {
    if (directionFilter === 'inbound' && t.destHubId !== activeHubId) return false;
    if (directionFilter === 'outbound' && t.sourceHubId !== activeHubId) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  const columns: Column<Transfer>[] = [
    {
      key: 'code',
      header: 'Transfer Reference',
      sortable: true,
      render: t => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block">{t.transferCode}</span>
          <span className="text-[10px] text-slate-400 font-mono">{t.carrierName || 'Unassigned'}</span>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Transfer Route',
      render: t => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800">{t.sourceHubName}</span>
          <span className="text-slate-400 mx-1.5">&rarr;</span>
          <span className="font-semibold text-slate-800">{t.destHubName}</span>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{t.distanceKm} km &bull; Est. cost: ${t.transportCost.toFixed(2)}</div>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Manifest Item',
      sortable: true,
      render: t => (
        <div>
          <span className="font-medium text-slate-900 block truncate max-w-xs">{t.productName}</span>
          <span className="font-mono text-xs text-blue-700 font-bold">{t.quantity} unit(s)</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Transfer Status',
      sortable: true,
      render: t => <StatusBadge status={t.status} />,
    },
    {
      key: 'schedule',
      header: 'Timing & Arrival',
      render: t => (
        <div className="text-xs text-slate-600">
          <div>ETA: <span className="font-medium text-slate-800">{t.estimatedArrival.slice(11, 16)}</span></div>
          <div className="text-[10px] text-slate-400">{t.createdAt.slice(0, 10)}</div>
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
          Manage
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Transfer Corridor Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track, dispatch, and confirm check-in of peer-to-peer inventory transfers across hubs.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<ArrowRightLeft className="w-4 h-4" />}
          onClick={() => navigate('/hub/recommendations')}
        >
          View Recommendations
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs">
            <button
              onClick={() => setDirectionFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                directionFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Corridor Movements
            </button>
            <button
              onClick={() => setDirectionFilter('inbound')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                directionFilter === 'inbound' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inbound Receiving
            </button>
            <button
              onClick={() => setDirectionFilter('outbound')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                directionFilter === 'outbound' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Outbound Dispatch
            </button>
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved (Awaiting Dispatch)</option>
            <option value="in_transit">In-Transit</option>
            <option value="received">Received & Admitted</option>
            <option value="exception">Exception / Discrepancy</option>
          </select>
        </div>

        <span className="text-xs text-slate-500">
          Showing <strong>{filteredTransfers.length}</strong> transfers
        </span>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredTransfers}
        keyExtractor={t => t.id}
        isLoading={isLoading}
        searchKeys={['transferCode', 'productName', 'sourceHubName', 'destHubName', 'carrierName']}
        searchPlaceholder="Filter transfers by code, product, or hub..."
        pageSize={8}
        onRowClick={t => navigate(`/hub/transfers/${t.id}`)}
      />
    </div>
  );
};
