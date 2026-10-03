import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { OrderService } from '../../services/orderService';
import { StorageService } from '../../services/storage';
import { LocalOrder, OrderStatus } from '../../types';
import { Table, Column } from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { StatusBadge, Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ShoppingBag, Lock, PackageCheck, Truck, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const OrderFulfillmentPage: React.FC = () => {
  const { currentHub, allHubs, selectHub } = useAuth();
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelOrderTarget, setCancelOrderTarget] = useState<LocalOrder | null>(null);
  const { showToast } = useToast();

  const activeHubId = currentHub?.id || allHubs[0]?.id;

  const loadOrders = async () => {
    setIsLoading(true);
    const data = await OrderService.getOrders({ hubId: activeHubId });
    setOrders(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, [activeHubId]);

  const handleReserve = async (orderId: string) => {
    try {
      const updated = await OrderService.reserveOrderStock(orderId);
      showToast({
        title: 'Stock Reserved',
        description: `Reserved ${updated.quantity} unit(s) of ${updated.productName} for ${updated.orderNumber}.`,
        type: 'success',
      });
      loadOrders();
    } catch (err: any) {
      showToast({ title: 'Reservation Failed', description: err.message, type: 'error' });
    }
  };

  const handlePrepare = async (orderId: string) => {
    try {
      await OrderService.prepareOrder(orderId);
      showToast({ title: 'Order Prepared', description: 'Item picked and packed into dispatch staging.', type: 'info' });
      loadOrders();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleReady = async (orderId: string) => {
    try {
      await OrderService.markReadyForPickup(orderId);
      showToast({ title: 'Ready for Customer', description: 'Customer notified for local pickup / courier dispatch.', type: 'info' });
      loadOrders();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleComplete = async (orderId: string) => {
    try {
      const updated = await OrderService.completeOrder(orderId);
      showToast({
        title: 'Order Fulfilled Locally',
        description: `${updated.orderNumber} successfully fulfilled from hyperlocal reverse-logistics stock.`,
        type: 'success',
      });
      loadOrders();
    } catch (err: any) {
      showToast({ title: 'Error', description: err.message, type: 'error' });
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelOrderTarget) return;
    try {
      await OrderService.cancelOrder(cancelOrderTarget.id);
      showToast({
        title: 'Order Cancelled',
        description: 'Reserved inventory released back to available stock.',
        type: 'info',
      });
      setCancelOrderTarget(null);
      loadOrders();
    } catch (err: any) {
      showToast({ title: 'Cancel Failed', description: err.message, type: 'error' });
    }
  };

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  const columns: Column<LocalOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Order Reference',
      sortable: true,
      render: o => (
        <div>
          <span className="font-mono font-semibold text-slate-900 block">{o.orderNumber}</span>
          <span className="text-[10px] text-slate-400">Customer: {o.customerName}</span>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product Allocated',
      sortable: true,
      render: o => (
        <div>
          <span className="font-medium text-slate-900 block truncate max-w-xs">{o.productName}</span>
          <span className="text-xs text-blue-700 font-mono font-bold">{o.quantity} unit(s) &bull; {o.sku}</span>
        </div>
      ),
    },
    {
      key: 'deliveryType',
      header: 'Delivery Type',
      render: o => (
        <Badge variant="neutral">
          {o.deliveryType === 'store_pickup' ? 'Store Pickup' : 'Local Courier'}
        </Badge>
      ),
    },
    {
      key: 'promisedDelivery',
      header: 'Promised By',
      sortable: true,
      render: o => <span className="text-slate-600 font-mono text-xs">{o.promisedDelivery}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: o => <StatusBadge status={o.status} />,
    },
    {
      key: 'actions',
      header: 'Fulfillment Actions',
      className: 'text-right',
      render: o => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          {o.status === 'pending' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Lock className="w-3.5 h-3.5" />}
              onClick={() => handleReserve(o.id)}
            >
              Reserve Stock
            </Button>
          )}

          {o.status === 'reserved' && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<PackageCheck className="w-3.5 h-3.5" />}
              onClick={() => handlePrepare(o.id)}
            >
              Pack Order
            </Button>
          )}

          {o.status === 'prepared' && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Truck className="w-3.5 h-3.5" />}
              onClick={() => handleReady(o.id)}
            >
              Ready
            </Button>
          )}

          {o.status === 'ready_for_pickup' && (
            <Button
              variant="success"
              size="sm"
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={() => handleComplete(o.id)}
            >
              Complete
            </Button>
          )}

          {['pending', 'reserved', 'prepared', 'ready_for_pickup'].includes(o.status) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setCancelOrderTarget(o)}
            >
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Hub Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Local Order Fulfillment Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Fulfill local customer demand using approved reverse-logistics inventory, preventing new manufacturing and shipping.
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

      {/* Verification notice */}
      <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Zero-Double Allocation Guarantee: </span>
          Reserving stock binds a specific available inventory unit to this order. The unit is immediately deducted from available sellable inventory, preventing concurrent allocations.
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
        >
          <option value="all">All Order Statuses</option>
          <option value="pending">Pending Reservation</option>
          <option value="reserved">Reserved</option>
          <option value="prepared">Prepared / Packed</option>
          <option value="ready_for_pickup">Ready for Pickup / Dispatch</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <span className="text-xs text-slate-500">
          Showing <strong>{filteredOrders.length}</strong> local orders
        </span>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredOrders}
        keyExtractor={o => o.id}
        isLoading={isLoading}
        searchKeys={['orderNumber', 'customerName', 'productName', 'sku']}
        searchPlaceholder="Search orders by number, customer, or SKU..."
        pageSize={8}
      />

      {/* Cancel Order Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelOrderTarget)}
        onClose={() => setCancelOrderTarget(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Order & Release Inventory"
        message={`Are you sure you want to cancel ${cancelOrderTarget?.orderNumber}? If stock was reserved, it will be automatically released back to available inventory.`}
        isDestructive={true}
        confirmLabel="Cancel Order & Release"
      />
    </div>
  );
};
