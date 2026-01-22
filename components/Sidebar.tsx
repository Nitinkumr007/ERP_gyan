
import React from 'react';
import { AppState, UserAccessMaster } from '../types';

interface SidebarProps {
  activePage: AppState;
  onNavigate: (page: AppState) => void;
  onLogout: () => void;
  isAdmin: boolean;
  currentUser?: UserAccessMaster | null;
}

interface NavItem {
  id: AppState;
  label: string;
  icon: string;
  badge?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, onLogout, isAdmin, currentUser }) => {
  const adminNavItems: NavItem[] = [
    { id: 'DASHBOARD', label: 'System Overview', icon: 'dashboard' },
    { id: 'ADD_DEMAND', label: 'New Demand', icon: 'add_shopping_cart' },
    { id: 'PRODUCT_MASTER', label: 'Product Master', icon: 'inventory_2' },
    { id: 'USER_MANAGEMENT', label: 'User Management', icon: 'group' },
    { id: 'DISTRIBUTOR_CONTROL', label: 'Distributor Control', icon: 'hub' },
    { id: 'SALES_HIERARCHY', label: 'Sales Hierarchy', icon: 'account_tree' },
    { id: 'UPLOAD_BALANCE', label: 'Upload Balance', icon: 'upload_file' },
    { id: 'PENDING_ORDERS', label: 'System Demands', icon: 'heap_snapshot_large', badge: 12 },
    { id: 'PARTNER_NETWORK', label: 'Partner Network', icon: 'handshake' },
    { id: 'ORDER_HISTORY', label: 'Order History', icon: 'history' },
    { id: 'BALANCE_CHECK', label: 'DBR Balance', icon: 'account_balance_wallet' },
    { id: 'SETTINGS', label: 'System Settings', icon: 'settings' },
    { id: 'REPORTS', label: 'Reports Center', icon: 'download' },
  ];

  const userNavItems: NavItem[] = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: 'grid_view' },
    { id: 'ADD_DEMAND', label: 'New Demand', icon: 'add_shopping_cart' },
    { id: 'PRODUCT_MASTER', label: 'Product Master', icon: 'inventory_2' },
    { id: 'PENDING_ORDERS', label: 'Pending Orders', icon: 'pending_actions' },
    { id: 'ORDER_HISTORY', label: 'Order History', icon: 'history' },
    { id: 'BALANCE_CHECK', label: 'DBR Balance', icon: 'account_balance_wallet' },
    { id: 'PARTNER_NETWORK', label: 'Your DB List', icon: 'list_alt' },
  ];

  const items = isAdmin ? adminNavItems : userNavItems;

  return (
    <aside className="w-72 flex-shrink-0 flex flex-col bg-[var(--bg-panel)] backdrop-blur-xl border-r border-[var(--border-color)] relative z-20 overflow-hidden transition-colors duration-300">
      {/* Header Profile Section */}
      <div
        onClick={() => onNavigate('PROFILE')}
        className="h-28 flex items-center gap-4 px-8 border-b border-white/5 flex-shrink-0 bg-forest-900/20 cursor-pointer hover:bg-white/5 transition-colors group"
      >
        <div className="relative">
          <div className="size-11 rounded-full border-2 border-gold-400/30 overflow-hidden shadow-lg group-hover:border-gold-400 transition-colors">
            {/* Placeholder Image or User Avatar if we had one */}
            <div className="w-full h-full bg-forest-800 flex items-center justify-center text-gold-400 font-bold text-lg">
              {currentUser?.user_name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-forest-950 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-bold text-white tracking-tight group-hover:text-gold-400 transition-colors">
            {currentUser?.user_name || 'Guest User'}
          </p>
          <p className="text-[10px] font-black text-gold-400 uppercase tracking-widest opacity-80">
            {currentUser?.role || (isAdmin ? 'Admin' : 'User')}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2 custom-scrollbar">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex w-full items-center gap-4 px-6 py-4 rounded-2xl transition-all group relative overflow-hidden ${activePage === item.id
              ? 'bg-forest-800 text-gold-400 border border-gold-400/10 shadow-xl shadow-black/40'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            {activePage === item.id && (
              <span className="absolute left-0 top-4 bottom-4 w-1 bg-gold-400 rounded-r-full"></span>
            )}
            <span className={`material-symbols-outlined text-[22px] transition-colors ${activePage === item.id ? 'text-gold-400' : 'text-gray-500 group-hover:text-gold-400'
              }`}>
              {item.icon}
            </span>
            <span className="text-sm font-bold tracking-wide">{item.label}</span>
            {item.badge && (
              <span className="ml-auto bg-gold-500 text-forest-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl bg-white/5 border border-white/5 text-gray-500 hover:text-white hover:bg-red-500/10 hover:border-red-500/30 transition-all font-black text-[10px] uppercase tracking-[0.25em]"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
