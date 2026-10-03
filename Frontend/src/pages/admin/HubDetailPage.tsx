import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HubService } from '../../services/hubService';
import { StorageService } from '../../services/storage';
import { Hub, InventoryItem, Transfer, ReturnItem } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Table, Column } from '../../components/common/Table';
import { ArrowLeft, MapPin, Phone, Mail, Building2, Boxes, ArrowRightLeft, RotateCcw, Power } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const HubDetailPage: React.FC = () => {
  const { hubId } = useParams<{ hubId: string }>();
  const [hub, setHub] = useState<Hub | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'transfers' | 'returns'>('inventory');
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const state = StorageService.getState();

  useEffect(() => {
    if (hubId) {
      HubService.getHubById(hubId).then(h => {
        setHub(h);
        setIsLoading(false);
      });
    }
  }, [hubId]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Loading hub record...</div>;
  }

  if (!hub) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-base font-bold text-slate-900">Hub not found</h2>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/admin/hubs')}>
          Back to Hub List
        </Button>
      </div>
    );
  }

  const hubInventory = state.inventory.filter(i => i.hubId === hub.id);
  const hubTransfers = state.transfers.filter(t => t.sourceHubId === hub.id || t.destHubId === hub.id);
  const hubReturns = state.returns.filter(r => r.hubId === hub.id);

  const occupancyPct = Math.round((hub.currentOccupancy / hub.capacity) * 100);

  const inventoryColumns: Column<InventoryItem>[] = [
    { key: 'sku', header: 'SKU', sortable: true, render: row => <span className="font-mono text-blue-700 font-semibold">{row.sku}</span> },
    { key: 'productName', header: 'Product Name', sortable: true, render: row => <span className="font-medium text-slate-900">{row.productName}</span> },
    { key: 'availableQuantity', header: 'Available', sortable: true, render: row => <span className="font-bold text-emerald-700">{row.availableQuantity}</span> },
    { key: 'reservedQuantity', header: 'Reserved', sortable: true, render: row => <span className="text-amber-700 font-medium">{row.reservedQuantity}</span> },
    { key: 'incomingQuantity', header: 'Incoming', sortable: true, render: row => <span className="text-blue-700">{row.incomingQuantity}</span> },
    { key: 'storageLocation', header: 'Location Bay', render: row => <span className="text-slate-500 font-mono text-[11px]">{row.storageLocation}</span> },
  ];

  const transferColumns: Column<Transfer>[] = [
    { key: 'transferCode', header: 'Transfer Code', render: t => <span className="font-semibold text-slate-900">{t.transferCode}</span> },
    { key: 'route', header: 'Route', render: t => <span className="text-slate-600">{t.sourceHubName} &rarr; {t.destHubName}</span> },
    { key: 'productName', header: 'Item & Qty', render: t => <span>{t.quantity}x {t.productName}</span> },
    { key: 'status', header: 'Status', render: t => <StatusBadge status={t.status} /> },
  ];

  const returnColumns: Column<ReturnItem>[] = [
    { key: 'rmaNumber', header: 'RMA #', render: r => <span className="font-mono text-blue-700">{r.rmaNumber}</span> },
    { key: 'productName', header: 'Product', render: r => <span className="font-medium text-slate-900">{r.productName}</span> },
    { key: 'reportedCondition', header: 'Condition', render: r => <span className="capitalize">{r.reportedCondition.replace('_', ' ')}</span> },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Back button and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/hubs')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Hubs
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{hub.name}</h1>
              <StatusBadge status={hub.operatingStatus} />
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {hub.address}, {hub.city}, {hub.state} {hub.zip} &bull; Lat: {hub.lat}, Lng: {hub.lng}
            </p>
          </div>
        </div>

        <Button
          variant={hub.operatingStatus === 'active' ? 'destructive' : 'success'}
          size="sm"
          leftIcon={<Power className="w-4 h-4" />}
          onClick={async () => {
            const updated = await HubService.toggleOperatingStatus(hub.id);
            setHub(updated);
            showToast({
              title: 'Status Updated',
              description: `Hub is now ${updated.operatingStatus.toUpperCase()}`,
              type: 'info',
            });
          }}
        >
          {hub.operatingStatus === 'active' ? 'Deactivate Hub' : 'Activate Hub'}
        </Button>
      </div>

      {/* Hub Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Capacity utilization */}
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Facility Capacity</p>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-slate-900">{hub.currentOccupancy} <span className="text-sm font-normal text-slate-500">/ {hub.capacity} units</span></span>
            <span className="text-sm font-bold text-teal-700">{occupancyPct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full ${occupancyPct > 85 ? 'bg-amber-500' : 'bg-teal-600'}`}
              style={{ width: `${Math.min(occupancyPct, 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {hub.capacity - hub.currentOccupancy} additional units headroom available
          </p>
        </Card>

        {/* Handling Capabilities */}
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Handling Capabilities</p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {hub.handlingCapabilities.map(cap => (
              <span key={cap} className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {cap}
              </span>
            ))}
          </div>
        </Card>

        {/* Primary Contact */}
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Facility Operations Lead</p>
          <div className="mt-2 text-sm">
            <div className="font-bold text-slate-900">{hub.contactPerson}</div>
            <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" /> {hub.contactPhone}
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> {hub.contactEmail}
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs for Inventory, Transfers, Returns */}
      <div className="border-b border-slate-200 flex items-center gap-6 text-sm">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`py-2.5 font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'inventory'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Local Stock ({hubInventory.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transfers')}
          className={`py-2.5 font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'transfers'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Corridor Transfers ({hubTransfers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={`py-2.5 font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'returns'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Intake Returns ({hubReturns.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'inventory' && (
        <Table
          columns={inventoryColumns}
          data={hubInventory}
          keyExtractor={i => i.id}
          searchKeys={['sku', 'productName', 'storageLocation']}
          searchPlaceholder="Search local stock at this hub..."
          pageSize={6}
        />
      )}

      {activeTab === 'transfers' && (
        <Table
          columns={transferColumns}
          data={hubTransfers}
          keyExtractor={t => t.id}
          pageSize={6}
          onRowClick={t => navigate(`/hub/transfers/${t.id}`)}
        />
      )}

      {activeTab === 'returns' && (
        <Table
          columns={returnColumns}
          data={hubReturns}
          keyExtractor={r => r.id}
          pageSize={6}
          onRowClick={r => navigate(`/returns/${r.id}`)}
        />
      )}
    </div>
  );
};
