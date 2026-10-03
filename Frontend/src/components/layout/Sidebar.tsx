import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  Sliders,
  History,
  ClipboardCheck,
  PlusCircle,
  FileSearch,
  Boxes,
  TrendingUp,
  ArrowRightLeft,
  Truck,
  AlertTriangle,
  Leaf,
  RotateCcw,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { currentUser, currentRole, switchRole, resetDemoData } = useAuth();

  interface NavItem {
    label: string;
    to: string;
    icon: React.ElementType;
    roles: UserRole[];
    badge?: string;
  }

  const navItems: { section: string; items: NavItem[] }[] = [
    {
      section: 'Administration',
      items: [
        { label: 'Network Overview', to: '/admin/dashboard', icon: LayoutDashboard, roles: ['admin'] },
        { label: 'Hubs & Network Map', to: '/admin/hubs', icon: Building2, roles: ['admin'] },
        { label: 'User Directory', to: '/admin/users', icon: Users, roles: ['admin'] },
        { label: 'Product Catalog', to: '/admin/products', icon: Package, roles: ['admin'] },
        { label: 'Network Policy & AI', to: '/admin/configuration', icon: Sliders, roles: ['admin'] },
        { label: 'System Audit Trail', to: '/admin/audit', icon: History, roles: ['admin'] },
      ],
    },
    {
      section: 'Reverse Logistics & QA',
      items: [
        { label: 'Inspection Workspace', to: '/inspection/dashboard', icon: ClipboardCheck, roles: ['admin', 'inspector'] },
        { label: 'Register New Return', to: '/returns/new', icon: PlusCircle, roles: ['admin', 'inspector'] },
        { label: 'All Returns (50+)', to: '/returns', icon: RotateCcw, roles: ['admin', 'inspector', 'hub_manager'] },
        { label: 'Inspection History', to: '/inspection/history', icon: FileSearch, roles: ['admin', 'inspector'] },
      ],
    },
    {
      section: 'Hyperlocal Hub Operations',
      items: [
        { label: 'Hub Operations', to: '/hub/dashboard', icon: LayoutDashboard, roles: ['admin', 'hub_manager'] },
        { label: 'Local Inventory', to: '/hub/inventory', icon: Boxes, roles: ['admin', 'hub_manager', 'logistics'] },
        { label: 'Demand Forecasts', to: '/hub/forecasts', icon: TrendingUp, roles: ['admin', 'hub_manager'] },
        { label: 'Stock Rebalancing', to: '/hub/recommendations', icon: ArrowRightLeft, roles: ['admin', 'hub_manager'] },
        { label: 'Local Orders', to: '/hub/orders', icon: ShoppingBag, roles: ['admin', 'hub_manager'] },
      ],
    },
    {
      section: 'Logistics & Dispatch',
      items: [
        { label: 'Logistics Command', to: '/logistics/dashboard', icon: Truck, roles: ['admin', 'logistics'] },
        { label: 'Pending Dispatch', to: '/logistics/dispatch', icon: ArrowRightLeft, roles: ['admin', 'logistics'] },
        { label: 'In-Transit Transfers', to: '/logistics/transfers', icon: Truck, roles: ['admin', 'logistics', 'hub_manager'] },
        { label: 'Receipt Exceptions', to: '/logistics/exceptions', icon: AlertTriangle, roles: ['admin', 'logistics', 'hub_manager'] },
      ],
    },
    {
      section: 'Impact & Sustainability',
      items: [
        { label: 'Impact Analytics', to: '/analytics/impact', icon: Leaf, roles: ['admin', 'analytics_viewer', 'hub_manager', 'inspector', 'logistics'] },
      ],
    },
  ];

  return (
    <aside
      className={`bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 transition-all duration-200 z-30 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-slate-800/80 gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-slate-950 font-bold tracking-wider text-sm shadow-xs shrink-0">
          HI
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-white truncate">HIEN</h1>
            <p className="text-[10px] text-teal-400 font-medium truncate uppercase tracking-wider">
              Hyperlocal Exchange
            </p>
          </div>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {navItems.map(sec => {
          // Filter items visible to current role
          const visibleItems = sec.items.filter(item => item.roles.includes(currentRole));
          if (visibleItems.length === 0) return null;

          return (
            <div key={sec.section}>
              {!collapsed && (
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {sec.section}
                </div>
              )}
              <div className="space-y-0.5">
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-teal-500/15 text-teal-400 font-semibold border border-teal-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        } ${collapsed ? 'justify-center px-2' : ''}`
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Role Switcher & User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        {!collapsed && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span>Demo Role Switcher</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-teal-950 text-teal-300 rounded border border-teal-800">
                PROTOTYPE
              </span>
            </div>
            <select
              value={currentRole}
              onChange={e => switchRole(e.target.value as UserRole)}
              className="w-full text-xs bg-slate-900 border border-slate-700 text-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="admin">Platform Administrator</option>
              <option value="inspector">Return Inspection Officer</option>
              <option value="hub_manager">Store / Hub Manager</option>
              <option value="logistics">Logistics Operator</option>
              <option value="analytics_viewer">Analytics Viewer</option>
            </select>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80'}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
            />
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 capitalize truncate">{currentUser.role.replace('_', ' ')}</p>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={() => {
                if (confirm('Reset prototype state to initial demo seed data?')) {
                  resetDemoData();
                  alert('Demo state reset successfully.');
                }
              }}
              title="Reset Demo Data"
              className="text-slate-400 hover:text-amber-400 p-1 rounded hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
