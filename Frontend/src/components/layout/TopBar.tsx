import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  Search,
  Bell,
  Building2,
  CheckCheck,
  RotateCcw,
  Truck,
  ExternalLink,
} from 'lucide-react';
import { StorageService } from '../../services/storage';
import { NotificationService } from '../../services/notificationService';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, onOpenSearch }) => {
  const { currentHub, allHubs, selectHub, currentUser, currentRole } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(() => StorageService.getState().notifications);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    await NotificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = async (notifId: string, link?: string, entityType?: string, entityId?: string) => {
    await NotificationService.markAsRead(notifId);
    setNotifications(prev => prev.map(n => (n.id === notifId ? { ...n, read: true } : n)));
    setShowNotifications(false);

    if (link) {
      navigate(link);
    } else if (entityType === 'return' && entityId) {
      navigate(`/returns/${entityId}`);
    } else if (entityType === 'transfer' && entityId) {
      navigate(`/hub/transfers/${entityId}`);
    } else if (entityType === 'hub' && entityId) {
      navigate(`/admin/hubs/${entityId}`);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0">
      {/* Left side: Toggle button and Hub Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Hub Context Selector */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              Active Hub Context
            </span>
            <select
              value={currentHub?.id || ''}
              onChange={e => selectHub(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent border-none p-0 focus:outline-none cursor-pointer hover:text-teal-700"
            >
              {allHubs.map(hub => (
                <option key={hub.id} value={hub.id}>
                  {hub.name} ({hub.city})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Right side: Global Search, Notifications, User Badge */}
      <div className="flex items-center gap-3">
        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/60 text-slate-500 text-xs transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Search RMA, SKU, Hub...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white rounded border border-slate-200 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifications(StorageService.getState().notifications);
              setShowNotifications(!showNotifications);
            }}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in duration-100">
                <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/75">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-teal-700 hover:underline flex items-center gap-1 font-medium"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n.id, n.link, n.entityType, n.entityId)}
                        className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                          !n.read ? 'bg-teal-50/20' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`font-semibold ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0">{n.timestamp}</span>
                        </div>
                        <p className="text-slate-500 mt-1 leading-relaxed text-[11px]">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Current Role Indicator Pill */}
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
            {currentUser.role.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
};
