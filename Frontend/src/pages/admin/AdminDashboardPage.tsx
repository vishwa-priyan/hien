import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../../services/storage';
import { AnalyticsService, ImpactSummary } from '../../services/analyticsService';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Table, Column } from '../../components/common/Table';
import { StatusBadge } from '../../components/common/Badge';
import {
  RotateCcw,
  Clock,
  CheckCircle2,
  Boxes,
  Truck,
  ShoppingBag,
  DollarSign,
  Compass,
  Leaf,
  PlusCircle,
  Building2,
  Users,
  Package,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { AuditEvent } from '../../types';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [impact, setImpact] = useState<ImpactSummary | null>(null);
  const state = StorageService.getState();

  useEffect(() => {
    AnalyticsService.getImpactMetrics().then(setImpact);
  }, []);

  const totalReturns = state.returns.length;
  const awaitingInspection = state.returns.filter(
    r => r.status === 'registered' || r.status === 'assessment_pending'
  ).length;
  const eligibleResale = state.returns.filter(r => r.status === 'approved_resale').length;
  const totalInventoryUnits = state.inventory.reduce((acc, i) => acc + i.totalQuantity, 0);
  const activeTransfers = state.transfers.filter(
    t => t.status === 'in_transit' || t.status === 'approved'
  ).length;
  const fulfilledOrders = state.orders.filter(o => o.status === 'fulfilled').length;

  // Chart data: Inventory distribution by Hub
  const inventoryByHub = state.hubs.map(h => {
    const hubItems = state.inventory.filter(i => i.hubId === h.id);
    const sellable = hubItems
      .filter(i => i.disposition === 'sellable')
      .reduce((sum, i) => sum + i.availableQuantity, 0);
    const reserved = hubItems.reduce((sum, i) => sum + i.reservedQuantity, 0);
    return {
      name: h.name.split(' ')[0],
      sellable,
      reserved,
      occupancy: `${Math.round((h.currentOccupancy / h.capacity) * 100)}%`,
    };
  });

  // Chart data: Return Disposition breakdown
  const statusCounts = state.returns.reduce((acc: Record<string, number>, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const dispositionData = [
    { name: 'Approved Resale', value: statusCounts['approved_resale'] || 0, color: '#059669' },
    { name: 'Assessment Pending', value: (statusCounts['registered'] || 0) + (statusCounts['assessment_pending'] || 0), color: '#d97706' },
    { name: 'Refurbishment', value: statusCounts['refurbishment_required'] || 0, color: '#2563eb' },
    { name: 'Quarantined', value: statusCounts['quarantined'] || 0, color: '#dc2626' },
    { name: 'Inspected', value: statusCounts['inspected'] || 0, color: '#0d9488' },
  ].filter(d => d.value > 0);

  // Recent operational activity
  const recentLogs: AuditEvent[] = state.auditLogs.slice(0, 6);

  const auditColumns: Column<AuditEvent>[] = [
    { key: 'timestamp', header: 'Timestamp', className: 'font-mono text-slate-500' },
    { key: 'actor', header: 'Actor', render: row => <span className="font-semibold text-slate-900">{row.actor}</span> },
    { key: 'action', header: 'Action', render: row => <span className="font-mono text-xs text-blue-700">{row.action}</span> },
    { key: 'newState', header: 'Operation Summary', render: row => <span className="truncate max-w-xs block text-slate-600">{row.newState}</span> },
    { key: 'result', header: 'Result', render: row => <StatusBadge status={row.result} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header and Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Network Operations Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time reverse-logistics telemetry, hyperlocal inventory health, and avoidance metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Building2 className="w-4 h-4" />}
            onClick={() => navigate('/admin/hubs')}
          >
            Manage Hubs
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<PlusCircle className="w-4 h-4" />}
            onClick={() => navigate('/returns/new')}
          >
            Register Return
          </Button>
        </div>
      </div>

      {/* Top Telemetry Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Total Returns"
          value={totalReturns}
          subtitle="All recorded RMAs"
          icon={RotateCcw}
          color="slate"
        />
        <StatCard
          title="Awaiting QA"
          value={awaitingInspection}
          subtitle="Pending physical sign-off"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Resale Eligible"
          value={eligibleResale}
          subtitle="100% QA inspected"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Local Stock"
          value={totalInventoryUnits}
          subtitle="Units across 5 hubs"
          icon={Boxes}
          color="teal"
        />
        <StatCard
          title="Active Transfers"
          value={activeTransfers}
          subtitle="In-transit or approved"
          icon={Truck}
          color="blue"
        />
        <StatCard
          title="Fulfilled Locally"
          value={fulfilledOrders}
          subtitle="Zero central detour"
          icon={ShoppingBag}
          color="purple"
        />
      </div>

      {/* Sustainability & Cost Avoidance Highlights */}
      {impact && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  Logistics Cost Avoided
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                  ${impact.costAvoided.toLocaleString()}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  vs Central Reverse-Logistics baseline (${impact.baselineLogisticsCost.toLocaleString()})
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-linear-to-br from-teal-500/10 via-teal-500/5 to-transparent border-teal-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-600 text-white rounded-xl shadow-xs">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-teal-800 uppercase tracking-wider">
                  Transport Distance Avoided
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                  {impact.distanceAvoidedKm.toLocaleString()} km
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hyperlocal routing avoids long-haul freight loops
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-linear-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 text-white rounded-xl shadow-xs">
                <Leaf className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                  Carbon Emissions Avoided
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                  {impact.emissionsAvoidedKg.toLocaleString()} kg CO₂e
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ~{impact.returnsResaleEligiblePct}% of eligible returns retained locally
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory by Hub */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Available vs Reserved Stock by Hub"
            subtitle="Real-time storage allocation and capacity across participating local exchange nodes"
          />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryByHub} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="sellable" name="Sellable Available" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reserved" name="Reserved for Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Return Disposition Breakdown */}
        <Card>
          <CardHeader
            title="Return Disposition Share"
            subtitle="Verified QA outcomes & AI assessment triage"
          />
          <CardContent className="h-72 flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={dispositionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {dispositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] mt-2">
              {dispositionData.map(d => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-slate-600">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Activity Stream */}
      <Card>
        <CardHeader
          title="Recent System Operations & Audit Trail"
          subtitle="Real-time log of returns, assessments, physical QA, transfers, and order reservations"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/audit')}
            >
              View Full Audit Log
            </Button>
          }
        />
        <Table
          columns={auditColumns}
          data={recentLogs}
          keyExtractor={row => row.id}
          pageSize={5}
        />
      </Card>
    </div>
  );
};
