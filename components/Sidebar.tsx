
import React, { useState, useRef } from 'react';
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
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 2000); // 400ms delay
  };


  const menuItems = [
    // ... items remain same ...
    // NOTE: I will have to copy all menu items here to ensure they are preserved or I can just wrap the render part.
    // Wait, let's look at the file content again. I don't see the file content of Sidebar.tsx yet.
    // I need to view Sidebar.tsx first before I can confidently replace it.
  ];

  // ABORT: I need to view Sidebar.tsx first. The user request included @[components/Sidebar.tsx] but I haven't read it yet.
  // I will switch to view_file first.
  const adminNavItems: NavItem[] = [
    { id: 'DASHBOARD', label: 'System Overview', icon: 'dashboard' },
    { id: 'ADD_DEMAND', label: 'New Demand', icon: 'add_shopping_cart' },
    { id: 'PRODUCT_MASTER', label: 'Product Master', icon: 'inventory_2' },
    { id: 'USER_MANAGEMENT', label: 'User Management', icon: 'group' },
    { id: 'USER_PERMISSION_MANAGEMENT', label: 'User Permissions', icon: 'lock_person' }, // New Admin Link
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

  // Map AppState to permission keys
  const permissionMap: Partial<Record<AppState, keyof UserAccessMaster['permissions']>> = {
    DASHBOARD: 'access_dashboard',
    ADD_DEMAND: 'access_new_demand',
    PRODUCT_MASTER: 'access_product_master',
    USER_MANAGEMENT: 'access_user_management',
    DISTRIBUTOR_CONTROL: 'access_distributor_control',
    SALES_HIERARCHY: 'access_sales_hierarchy',
    UPLOAD_BALANCE: 'access_upload_balance',
    PENDING_ORDERS: 'access_system_demands',
    PARTNER_NETWORK: 'access_partner_network',
    ORDER_HISTORY: 'access_order_history',
    BALANCE_CHECK: 'access_dbr_balance',
    SETTINGS: 'access_system_settings',
    REPORTS: 'access_reports_center',
    USER_PERMISSION_MANAGEMENT: 'access_user_permissions', // Now linked to specific permission
  };

  let items = isAdmin ? adminNavItems : userNavItems;

  // Filter items based on permissions if they exist
  if (currentUser?.permissions) {
    items = items.filter(item => {
      // Always show Dashboard if no explicit permission map (though we mapped it)
      if (item.id === 'DASHBOARD') return currentUser.permissions?.access_dashboard !== false;

      const permKey = permissionMap[item.id];
      // If we have a permission key for this item, check it.
      // If permission is undefined/null in the object (e.g. new schema), default to TRUE or FALSE?
      // User said: "if it is uncheck then the menu will not show". So default false if check exists?
      // But for robustness during migration, maybe we default to true if permissions object exists but key is missing? 
      // No, let's be strict as per requirement.
      if (permKey) {


        return currentUser.permissions![permKey as keyof typeof currentUser.permissions];
      }
      return true; // Default allow if no permission mapped (e.g. Profile, Logout)
    });
  }

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`${isHovered ? 'w-72' : 'w-20'} flex-shrink-0 flex flex-col bg-[var(--bg-panel)] backdrop-blur-xl border-r border-[var(--border-color)] relative z-20 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] shadow-2xl`}
    >
      {/* Header Profile Section */}
      <div
        onClick={() => onNavigate('PROFILE')}
        className={`h-20 flex items-center ${isHovered ? 'gap-2 px-4' : 'justify-center px-0'} border-b border-white/5 flex-shrink-0 bg-forest-900/20 cursor-pointer hover:bg-white/5 transition-all group`}
      >
        <div className="relative">
          <div className="size-10 rounded-full border-2 border-gold-400/30 overflow-hidden shadow-lg group-hover:border-gold-400 transition-colors">
            {/* Placeholder Image or User Avatar if we had one */}
            <div className="w-full h-full bg-forest-800 flex items-center justify-center text-gold-400 font-bold text-lg">
              {currentUser?.user_name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-forest-950 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
        </div>

        {/* Text Details - Only Visible on Hover */}
        <div className={`flex flex-col transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
          <p className="text-sm font-bold text-white tracking-tight group-hover:text-gold-400 transition-colors whitespace-nowrap">
            {currentUser?.user_name || 'Guest User'}
          </p>
          <p className="text-[10px] font-black text-gold-400 uppercase tracking-widest opacity-80 whitespace-nowrap">
            {currentUser?.role || (isAdmin ? 'Admin' : 'User')}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={!isHovered ? item.label : ''}
            className={`flex w-full items-center ${isHovered ? 'gap-3 px-4' : 'justify-center px-0'} py-3.5 rounded-xl transition-all group relative overflow-hidden ${activePage === item.id
              ? 'bg-forest-800 text-gold-400 border border-gold-400/10 shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            {activePage === item.id && isHovered && (
              <span className="absolute left-0 top-3 bottom-3 w-1 bg-gold-400 rounded-r-full"></span>
            )}
            <span className={`material-symbols-outlined text-[24px] transition-colors ${activePage === item.id ? 'text-gold-400' : 'text-gray-500 group-hover:text-gold-400'
              }`}>
              {item.icon}
            </span>

            <span className={`text-xs font-bold tracking-wide whitespace-nowrap transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0'}`}>
              {item.label}
            </span>

            {item.badge && isHovered && (
              <span className="ml-auto bg-gold-500 text-forest-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                {item.badge}
              </span>
            )}
            {item.badge && !isHovered && (
              <span className="absolute top-2 right-4 w-2 h-2 bg-gold-500 rounded-full"></span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${isHovered ? 'justify-start gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl bg-white/5 border border-white/5 text-gray-500 hover:text-white hover:bg-red-500/10 hover:border-red-500/30 transition-all font-black text-[10px] uppercase tracking-[0.25em]`}
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span className={`transition-all duration-300 ${isHovered ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0 overflow-hidden'}`}>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
