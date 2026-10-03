import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RotateCcw, Package, ArrowRightLeft, ShoppingBag, Building2, X } from 'lucide-react';
import { StorageService } from '../../services/storage';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const state = StorageService.getState();
  const q = query.toLowerCase().trim();

  const matchingReturns = q
    ? state.returns.filter(
        r =>
          r.rmaNumber.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.orderReference.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchingProducts = q
    ? state.products.filter(
        p => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchingTransfers = q
    ? state.transfers.filter(
        t =>
          t.transferCode.toLowerCase().includes(q) ||
          t.productName.toLowerCase().includes(q) ||
          t.sourceHubName.toLowerCase().includes(q) ||
          t.destHubName.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchingOrders = q
    ? state.orders.filter(
        o => o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchingHubs = q
    ? state.hubs.filter(
        h => h.name.toLowerCase().includes(q) || h.city.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const hasResults =
    matchingReturns.length > 0 ||
    matchingProducts.length > 0 ||
    matchingTransfers.length > 0 ||
    matchingOrders.length > 0 ||
    matchingHubs.length > 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3 bg-white">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search returns (RMA), products (SKU), transfers, orders, hubs..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full text-sm text-slate-900 placeholder-slate-400 focus:outline-none bg-transparent"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto space-y-4 text-xs divide-y divide-slate-100">
          {!q && (
            <div className="p-8 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="font-medium text-slate-600">Quick Global Search</p>
              <p className="text-xs text-slate-400 mt-1">
                Type an RMA number (e.g. RMA-2026-9081), SKU (SKU-AUD-801), or transfer code.
              </p>
            </div>
          )}

          {q && !hasResults && (
            <div className="p-8 text-center text-slate-400">
              <p className="font-medium text-slate-600">No matching records found for "{query}"</p>
            </div>
          )}

          {/* Returns */}
          {matchingReturns.length > 0 && (
            <div className="pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Returns & RMAs
              </div>
              {matchingReturns.map(r => (
                <div
                  key={r.id}
                  onClick={() => {
                    navigate(`/returns/${r.id}`);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{r.rmaNumber}</span>
                    <span className="text-slate-500 ml-2">{r.productName}</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {r.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Products */}
          {matchingProducts.length > 0 && (
            <div className="pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Products & SKUs
              </div>
              {matchingProducts.map(p => (
                <div
                  key={p.sku}
                  onClick={() => {
                    navigate(`/hub/inventory`);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-mono font-medium text-blue-700">{p.sku}</span>
                    <span className="text-slate-700 ml-2 font-medium">{p.name}</span>
                  </div>
                  <span className="text-slate-500 font-semibold">${p.sellingPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Transfers */}
          {matchingTransfers.length > 0 && (
            <div className="pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5" /> Inventory Transfers
              </div>
              {matchingTransfers.map(t => (
                <div
                  key={t.id}
                  onClick={() => {
                    navigate(`/hub/transfers/${t.id}`);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{t.transferCode}</span>
                    <span className="text-slate-500 ml-2">
                      {t.sourceHubName} &rarr; {t.destHubName}
                    </span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Orders */}
          {matchingOrders.length > 0 && (
            <div className="pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> Local Orders
              </div>
              {matchingOrders.map(o => (
                <div
                  key={o.id}
                  onClick={() => {
                    navigate(`/hub/orders`);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{o.orderNumber}</span>
                    <span className="text-slate-500 ml-2">Customer: {o.customerName}</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Hubs */}
          {matchingHubs.length > 0 && (
            <div className="pt-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Participating Hubs
              </div>
              {matchingHubs.map(h => (
                <div
                  key={h.id}
                  onClick={() => {
                    navigate(`/admin/hubs/${h.id}`);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{h.name}</span>
                    <span className="text-slate-500 ml-2">{h.city}, {h.state}</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                    {h.currentOccupancy} / {h.capacity} units
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Press ESC to close</span>
          <span>HIEN Global Lookup</span>
        </div>
      </div>
    </div>
  );
};
