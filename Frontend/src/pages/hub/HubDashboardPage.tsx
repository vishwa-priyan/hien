import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/storage';
import { StatCard } from '../../components/common/StatCard';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import {
  Boxes,
  CheckCircle2,
  Lock,
  ArrowRightLeft,
  Truck,
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export const HubDashboardPage: React.FC = () => {
  const { currentHub, allHubs, selectHub } = useAuth();
  const navigate = useNavigate();
  const state = StorageService.getState();

  const activeHubId = currentHub?.id || state.hubs[0].id;
  const hub = state.hubs.find(h => h.id === activeHubId) || state.hubs[0];

  const hubInventory = state.inventory.filter(i => i.hubId === hub.id);
  const totalUnits = hubInventory.reduce((sum, i) => sum + i.totalQuantity, 0);
  const availableUnits = hubInventory
    .filter(i => i.disposition === 'sellable')
    .reduce((sum, i) => sum + i.availableQuantity, 0);
  const reservedUnits = hubInventory.reduce((sum, i) => sum + i.reservedQuantity, 0);
  const incomingTransfers = state.transfers.filter(
    t => t.destHubId === hub.id && (t.status === 'in_transit' || t.status === 'approved')
  ).length;
  const outgoingTransfers = state.transfers.filter(
    t => t.sourceHubId === hub.id && (t.status === 'in_transit' || t.status === 'approved')
  ).length;

  const lowStockItems = hubInventory.filter(i => i.availableQuantity < 3 && i.disposition === 'sellable');
  const surplusItems = hubInventory.filter(i => i.availableQuantity > i.targetStock);
  const pendingRecommendations = state.recommendations.filter(
    r => (r.sourceHubId === hub.id || r.destHubId === hub.id) && r.status === 'proposed'
  ).length;
  const pendingOrders = state.orders.filter(
    o => o.assignedHubId === hub.id && o.status === 'pending'
  ).length;

  // Chart data: Stock level vs Target by SKU
  const stockComparisonData = hubInventory.slice(0, 8).map(i => ({
    name: i.sku.replace('SKU-', ''),
    Available: i.availableQuantity,
    Target: i.targetStock,
  }));

  // Capacity calculations
  const occupancyPct = Math.round((hub.currentOccupancy / hub.capacity) * 100);
  const isNearCapacity = occupancyPct > 85;

  return (
    <div className="space-y-6">
      {/* Hub selector and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {hub.name}
            </h1>
            <Badge variant={hub.type === 'warehouse' ? 'purple' : 'info'}>
              {hub.type.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Local store inventory balancing, order reservations, and incoming/outgoing transfer telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={hub.id}
            onChange={e => selectHub(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            {allHubs.map(h => (
              <option key={h.id} value={h.id}>
                Switch Hub: {h.name} ({h.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Near capacity warning banner if >85% */}
      {isNearCapacity && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Storage Alert:</strong> This facility is at <strong>{occupancyPct}%</strong> capacity ({hub.currentOccupancy}/{hub.capacity} units). Prioritizing outbound inventory transfers to alleviate floor congestion.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/hub/recommendations')}
          >
            View Rebalancing
          </Button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Stock"
          value={totalUnits}
          subtitle={`Occupancy: ${occupancyPct}%`}
          icon={Boxes}
          color="slate"
        />
        <StatCard
          title="Available for Sale"
          value={availableUnits}
          subtitle="Certified sellable"
          icon={CheckCircle2}
          color="teal"
        />
        <StatCard
          title="Reserved for Orders"
          value={reservedUnits}
          subtitle="Pending pickup/courier"
          icon={Lock}
          color="blue"
        />
        <StatCard
          title="Inbound Transfers"
          value={incomingTransfers}
          subtitle="En-route to this hub"
          icon={Truck}
          color="purple"
        />
        <StatCard
          title="Orders to Fulfill"
          value={pendingOrders}
          subtitle="Awaiting reservation"
          icon={ShoppingBag}
          color="amber"
        />
      </div>

      {/* Main Charts & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Level vs Target Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Available Stock vs Target Level"
            subtitle="Comparing real-time sellable inventory against the 14-day target reorder threshold"
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/hub/inventory')}
              >
                View Full Inventory
              </Button>
            }
          />
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Available" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Operational Attention Queue */}
        <Card>
          <CardHeader
            title="Operational Queue"
            subtitle="Immediate action items for this hub"
          />
          <CardContent className="space-y-4 text-xs">
            {/* Low stock alerts */}
            <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between font-bold text-red-900 mb-1">
                <span>Low Stock Stockout Risk</span>
                <span>{lowStockItems.length} SKUs</span>
              </div>
              <p className="text-slate-600 mb-2">
                Items with fewer than 3 available units remaining in stock.
              </p>
              {lowStockItems.slice(0, 2).map(i => (
                <div key={i.id} className="text-[11px] text-slate-800 flex justify-between py-0.5">
                  <span className="truncate max-w-[150px]">{i.productName}</span>
                  <span className="font-bold text-red-700">{i.availableQuantity} left</span>
                </div>
              ))}
            </div>

            {/* Transfer recommendations alert */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between font-bold text-blue-900 mb-1">
                <span>Transfer Proposals</span>
                <span>{pendingRecommendations} pending</span>
              </div>
              <p className="text-slate-600 mb-2">
                Algorithmically recommended peer-to-peer balancing routes available for approval.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate('/hub/recommendations')}
              >
                Review Recommendations
              </Button>
            </div>

            {/* Orders ready */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
              <div className="flex items-center justify-between font-bold text-emerald-900 mb-1">
                <span>Local Order Fulfillment</span>
                <span>{pendingOrders} awaiting</span>
              </div>
              <p className="text-slate-600 mb-2">
                Eligible orders allocated to this hub's local stock.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate('/hub/orders')}
              >
                Process Orders Queue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
