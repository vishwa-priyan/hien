import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReturnService } from '../../services/returnService';
import { StorageService } from '../../services/storage';
import { ReturnItem } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import {
  ClipboardCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Filter,
  Eye,
  Sparkles,
} from 'lucide-react';

export const InspectionDashboardPage: React.FC = () => {
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [hubFilter, setHubFilter] = useState('all');

  const navigate = useNavigate();
  const hubs = StorageService.getState().hubs;

  useEffect(() => {
    ReturnService.getReturns().then(data => {
      setReturns(data);
      setIsLoading(false);
    });
  }, []);

  const awaitingAssessment = returns.filter(r => r.status === 'registered').length;
  const awaitingInspection = returns.filter(r => r.status === 'assessment_pending').length;
  const highRiskReturns = returns.filter(
    r => r.assessment?.riskFlags && r.assessment.riskFlags.length > 0
  ).length;
  const lowConfidence = returns.filter(
    r => r.assessment && r.assessment.confidenceScore < 0.8
  ).length;
  const approvedToday = returns.filter(r => r.status === 'approved_resale').length;
  const rejectedToday = returns.filter(
    r => r.status === 'rejected' || r.status === 'not_suitable'
  ).length;

  const filteredReturns = returns.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    if (hubFilter !== 'all' && r.hubId !== hubFilter) return false;
    return true;
  });

  const categories = Array.from(new Set(returns.map(r => r.category)));

  const columns: Column<ReturnItem>[] = [
    {
      key: 'rma',
      header: 'RMA / Order',
      sortable: true,
      render: r => (
        <div>
          <span className="font-semibold text-slate-900 block font-mono">{r.rmaNumber}</span>
          <span className="text-[10px] text-slate-400 font-mono">{r.orderReference}</span>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product Item',
      sortable: true,
      render: r => (
        <div className="flex items-center gap-2.5">
          <img
            src={r.primaryImage}
            alt=""
            className="w-9 h-9 rounded-md object-cover border border-slate-200 shrink-0 bg-slate-100"
          />
          <div>
            <span className="font-medium text-slate-900 block truncate max-w-xs">{r.productName}</span>
            <span className="text-[10px] text-slate-400">{r.category} &bull; Qty: {r.quantity}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'hub',
      header: 'Return Hub',
      sortable: true,
      render: r => <span className="text-slate-700">{r.hubName.split(' ')[0]} Hub</span>,
    },
    {
      key: 'reportedCondition',
      header: 'Reported Condition',
      render: r => (
        <Badge variant={r.reportedCondition === 'damaged' ? 'danger' : r.reportedCondition === 'like_new' ? 'success' : 'warning'}>
          {r.reportedCondition.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'aiAssessment',
      header: 'AI Inference Score',
      render: r => {
        if (!r.assessment) {
          return <span className="text-slate-400 italic text-[11px]">Unassessed</span>;
        }
        const pct = Math.round(r.assessment.confidenceScore * 100);
        const hasRisk = r.assessment.riskFlags.length > 0;
        return (
          <div className="flex items-center gap-1.5">
            <span className={`font-mono text-xs font-bold ${pct >= 80 ? 'text-teal-700' : 'text-amber-700'}`}>
              {pct}%
            </span>
            {hasRisk && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800" title={r.assessment.riskFlags.join(', ')}>
                FLAG
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Inspection Status',
      sortable: true,
      render: r => <StatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: r => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          {r.status === 'registered' ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => navigate(`/returns/${r.id}/assessment`)}
            >
              Assess
            </Button>
          ) : r.status === 'assessment_pending' ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ClipboardCheck className="w-3.5 h-3.5" />}
              onClick={() => navigate(`/returns/${r.id}/inspection`)}
            >
              Inspect
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Eye className="w-3.5 h-3.5" />}
              onClick={() => navigate(`/returns/${r.id}`)}
            >
              Details
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Return Inspection & QA Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review customer returns, inspect CNN defect annotations, run AI predictions, and execute physical checklists.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Awaiting AI Screen"
          value={awaitingAssessment}
          subtitle="New returns"
          icon={Clock}
          color="slate"
        />
        <StatCard
          title="Awaiting Physical QA"
          value={awaitingInspection}
          subtitle="Ready in QA Bay"
          icon={ClipboardCheck}
          color="amber"
        />
        <StatCard
          title="AI Risk Flags"
          value={highRiskReturns}
          subtitle="Requires attention"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Low Confidence"
          value={lowConfidence}
          subtitle="&lt;80% ML score"
          icon={Filter}
          color="blue"
        />
        <StatCard
          title="Approved Resale"
          value={approvedToday}
          subtitle="Passed all checkpoints"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Rejected / Salvage"
          value={rejectedToday}
          subtitle="Non-resalable"
          icon={XCircle}
          color="slate"
        />
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Inspection Statuses</option>
            <option value="registered">Registered (Unassessed)</option>
            <option value="assessment_pending">Assessment Pending QA</option>
            <option value="approved_resale">Approved for Resale</option>
            <option value="refurbishment_required">Refurbishment Required</option>
            <option value="quarantined">Quarantined</option>
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Product Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={hubFilter}
            onChange={e => setHubFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Intake Hubs</option>
            {hubs.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong>{filteredReturns.length}</strong> returned items
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredReturns}
        keyExtractor={r => r.id}
        isLoading={isLoading}
        searchKeys={['rmaNumber', 'productName', 'orderReference', 'sku']}
        searchPlaceholder="Search by RMA, SKU, product, or order reference..."
        pageSize={10}
        onRowClick={r => {
          if (r.status === 'registered') {
            navigate(`/returns/${r.id}/assessment`);
          } else if (r.status === 'assessment_pending') {
            navigate(`/returns/${r.id}/inspection`);
          } else {
            navigate(`/returns/${r.id}`);
          }
        }}
      />
    </div>
  );
};
