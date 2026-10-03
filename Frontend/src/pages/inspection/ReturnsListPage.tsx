import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReturnService } from '../../services/returnService';
import { StorageService } from '../../services/storage';
import { ReturnItem, ReturnStatus } from '../../types';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { PlusCircle, RotateCcw, Eye, Sparkles, ClipboardCheck } from 'lucide-react';

export const ReturnsListPage: React.FC = () => {
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [hubFilter, setHubFilter] = useState('all');
  const navigate = useNavigate();

  const hubs = StorageService.getState().hubs;

  useEffect(() => {
    ReturnService.getReturns().then(data => {
      setReturns(data);
      setIsLoading(false);
    });
  }, []);

  const filtered = returns.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (hubFilter !== 'all' && r.hubId !== hubFilter) return false;
    return true;
  });

  const columns: Column<ReturnItem>[] = [
    {
      key: 'rmaNumber',
      header: 'RMA Number',
      sortable: true,
      render: r => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block">{r.rmaNumber}</span>
          <span className="text-[10px] text-slate-400 font-mono">{r.orderReference}</span>
        </div>
      ),
    },
    {
      key: 'productName',
      header: 'Product Item',
      sortable: true,
      render: r => (
        <div className="flex items-center gap-2.5">
          <img src={r.primaryImage} alt="" className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0" />
          <div className="truncate max-w-xs">
            <span className="font-medium text-slate-900 block truncate">{r.productName}</span>
            <span className="text-[10px] text-slate-400 font-mono">{r.sku}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'hubName',
      header: 'Intake Hub',
      sortable: true,
      render: r => <span className="text-slate-700">{r.hubName.split(' ')[0]} Hub</span>,
    },
    {
      key: 'reportedCondition',
      header: 'Condition',
      render: r => <span className="capitalize text-slate-700">{r.reportedCondition.replace('_', ' ')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: r => <StatusBadge status={r.status} />,
    },
    {
      key: 'createdAt',
      header: 'Created At',
      sortable: true,
      render: r => <span className="text-slate-500 font-mono text-[11px]">{r.createdAt.slice(0, 10)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: r => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/returns/${r.id}`)}
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
            Returns Worklist ({returns.length} Records)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete database of active and completed customer reverse-logistics returns.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<PlusCircle className="w-4 h-4" />}
          onClick={() => navigate('/returns/new')}
        >
          Register New Return
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
        >
          <option value="all">All Lifecycle Statuses</option>
          <option value="registered">Registered</option>
          <option value="assessment_pending">Assessment Pending</option>
          <option value="approved_resale">Approved for Resale</option>
          <option value="refurbishment_required">Refurbishment Required</option>
          <option value="quarantined">Quarantined</option>
        </select>

        <select
          value={hubFilter}
          onChange={e => setHubFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
        >
          <option value="all">All Hub Locations</option>
          {hubs.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>

      <Table
        columns={columns}
        data={filtered}
        keyExtractor={r => r.id}
        isLoading={isLoading}
        searchKeys={['rmaNumber', 'productName', 'orderReference', 'sku']}
        searchPlaceholder="Search all returns..."
        pageSize={12}
        onRowClick={r => navigate(`/returns/${r.id}`)}
      />
    </div>
  );
};
