import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { InventoryService } from '../../services/inventoryService';
import { StorageService } from '../../services/storage';
import { InventoryItem } from '../../types';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Boxes, Lock, Truck, TrendingUp, AlertTriangle, ArrowRightLeft, ShieldCheck, Eye } from 'lucide-react';

export const LocalInventoryPage: React.FC = () => {
  const { currentHub, allHubs, selectHub } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dispositionFilter, setDispositionFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const navigate = useNavigate();

  const activeHubId = currentHub?.id || allHubs[0]?.id;

  const loadData = async () => {
    setIsLoading(true);
    const data = await InventoryService.getInventory({
      hubId: activeHubId,
    });
    setInventory(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeHubId]);

  const filteredInventory = dispositionFilter === 'all'
    ? inventory
    : inventory.filter(i => i.disposition === dispositionFilter);

  const columns: Column<InventoryItem>[] = [
    {
      key: 'sku',
      header: 'SKU Identifier',
      sortable: true,
      render: item => (
        <div>
          <span className="font-mono font-semibold text-blue-700 block">{item.sku}</span>
          <span className="text-[10px] text-slate-400">{item.storageLocation}</span>
        </div>
      ),
    },
    {
      key: 'productName',
      header: 'Product & Variant',
      sortable: true,
      render: item => (
        <div>
          <span className="font-medium text-slate-900 block truncate max-w-xs">{item.productName}</span>
          <span className="text-[11px] text-slate-500">{item.variant} &bull; {item.category}</span>
        </div>
      ),
    },
    {
      key: 'quantities',
      header: 'Stock Breakdown',
      render: item => (
        <div className="flex items-center gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Total</span>
            <span className="font-bold text-slate-900">{item.totalQuantity}</span>
          </div>
          <div>
            <span className="text-emerald-700 block text-[10px] uppercase font-bold">Available</span>
            <span className="font-bold text-emerald-700">{item.availableQuantity}</span>
          </div>
          <div>
            <span className="text-amber-700 block text-[10px] uppercase font-bold">Reserved</span>
            <span className="font-bold text-amber-700">{item.reservedQuantity}</span>
          </div>
          <div>
            <span className="text-blue-700 block text-[10px] uppercase font-bold">Incoming</span>
            <span className="font-bold text-blue-700">{item.incomingQuantity}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'forecast',
      header: 'Target vs Demand',
      sortable: true,
      render: item => (
        <div className="text-xs">
          <div>
            <span className="text-slate-500">Target: </span>
            <span className="font-semibold text-slate-800">{item.targetStock}</span>
          </div>
          <div>
            <span className="text-slate-500">Forecast: </span>
            <span className="font-semibold text-teal-700">{item.forecastDemand} units</span>
          </div>
        </div>
      ),
    },
    {
      key: 'disposition',
      header: 'Disposition State',
      sortable: true,
      render: item => (
        <Badge variant={item.disposition === 'sellable' ? 'success' : item.disposition === 'quarantined' ? 'danger' : 'warning'}>
          {item.disposition.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'price',
      header: 'Price / Unit Cost',
      sortable: true,
      render: item => (
        <div className="text-xs">
          <span className="font-bold text-slate-900 block">${item.sellingPrice.toFixed(2)}</span>
          <span className="text-[10px] text-slate-400 block">Cost: ${item.unitCost.toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: item => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedItem(item)}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Hub Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Local Facility Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time sellable, reserved, and incoming inventory units at {currentHub?.name || 'this facility'}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeHubId}
            onChange={e => selectHub(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800"
          >
            {allHubs.map(h => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Safety Policy Notice */}
      <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
          <span>
            <strong>Inventory Rule:</strong> Sellable stock is populated strictly through verified return QA inspections or incoming transfer check-ins. Manual promotion of uninspected or quarantined items is prohibited.
          </span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={dispositionFilter}
            onChange={e => setDispositionFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="all">All Dispositions</option>
            <option value="sellable">Sellable Available Only</option>
            <option value="quarantined">Quarantined Only</option>
            <option value="refurbishment">Refurbishment Staging Only</option>
          </select>
        </div>

        <span className="text-xs text-slate-500">
          Showing <strong>{filteredInventory.length}</strong> inventory records
        </span>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredInventory}
        keyExtractor={i => i.id}
        isLoading={isLoading}
        searchKeys={['sku', 'productName', 'variant', 'category', 'storageLocation']}
        searchPlaceholder="Filter inventory by SKU, product name, or bay..."
        pageSize={10}
        onRowClick={item => setSelectedItem(item)}
      />

      {/* Item Detail Drawer / Modal */}
      <Modal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem ? `${selectedItem.productName} (${selectedItem.sku})` : ''}
        description={`Inventory ledger and stock distribution at ${selectedItem?.hubName}`}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<TrendingUp className="w-4 h-4" />}
              onClick={() => {
                if (selectedItem) {
                  navigate(`/hub/forecasts?sku=${selectedItem.sku}&hubId=${selectedItem.hubId}`);
                }
              }}
            >
              View Demand Forecast
            </Button>
            <Button variant="primary" size="sm" onClick={() => setSelectedItem(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedItem && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                <span className="font-semibold text-slate-900">{selectedItem.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Variant Spec</span>
                <span className="font-semibold text-slate-900">{selectedItem.variant}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Storage Location</span>
                <span className="font-mono text-slate-900">{selectedItem.storageLocation}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Disposition</span>
                <Badge variant={selectedItem.disposition === 'sellable' ? 'success' : 'danger'}>
                  {selectedItem.disposition.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-slate-900">Current Unit Distribution:</h4>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total</span>
                  <span className="text-lg font-bold text-slate-900">{selectedItem.totalQuantity}</span>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-emerald-800 block text-[10px] uppercase font-bold">Available</span>
                  <span className="text-lg font-bold text-emerald-800">{selectedItem.availableQuantity}</span>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-amber-800 block text-[10px] uppercase font-bold">Reserved</span>
                  <span className="text-lg font-bold text-amber-800">{selectedItem.reservedQuantity}</span>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-blue-800 block text-[10px] uppercase font-bold">Incoming</span>
                  <span className="text-lg font-bold text-blue-800">{selectedItem.incomingQuantity}</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 flex justify-between">
              <span>Unit Resale Price: <strong className="text-slate-900">${selectedItem.sellingPrice.toFixed(2)}</strong></span>
              <span>Replenishment Cost: <strong className="text-slate-900">${selectedItem.unitCost.toFixed(2)}</strong></span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
