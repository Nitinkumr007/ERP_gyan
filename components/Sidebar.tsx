
import React, { useState, useRef } from 'react';
import { AppState, UserAccessMaster } from '../types';

interface SidebarProps {
  activePage: AppState;
  onNavigate: (page: AppState) => void;
  onLogout: () => void;
  isAdmin: boolean;
  currentUser?: UserAccessMaster | null;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

interface NavItem {
  id: AppState;
  label: string;
  icon: string;
  badge?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, onLogout, isAdmin, currentUser, isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleMouseEnter = () => {
    // Only hover effect on Desktop (when menu is not forced open by mobile state)
    if (window.innerWidth >= 768) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (window.innerWidth >= 768) {
      timeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 2000); // 400ms delay
    }
  };


  const menuItems = [
    // ... items would be here if not dynamically set below
  ];

  const adminNavItems: NavItem[] = [
    { id: 'DASHBOARD', label: 'System Overview', icon: 'dashboard' },
    { id: 'ADD_DEMAND', label: 'New Demand', icon: 'add_shopping_cart' },
    { id: 'PRODUCT_MASTER', label: 'Product Master', icon: 'inventory_2' },
    { id: 'USER_MANAGEMENT', label: 'User Management', icon: 'group' },
    { id: 'USER_PERMISSION_MANAGEMENT', label: 'User Permissions', icon: 'lock_person' }, // New Admin Link
    { id: 'DISTRIBUTOR_CONTROL', label: 'Distributor Control', icon: 'hub' },
    { id: 'SALES_HIERARCHY', label: 'Sales Hierarchy', icon: 'account_tree' },
    { id: 'MICRO_MASTERS', label: 'Micro Masters', icon: 'dataset' },
    { id: 'UPLOAD_BALANCE', label: 'Upload Balance', icon: 'upload_file' },
    { id: 'PENDING_ORDERS', label: 'System Demands', icon: 'heap_snapshot_large', badge: 12 },
    { id: 'PARTNER_NETWORK', label: 'Partner Network', icon: 'handshake' },
    { id: 'ORDER_HISTORY', label: 'Order History', icon: 'history' },
    { id: 'BALANCE_CHECK', label: 'DBR Balance', icon: 'account_balance_wallet' },
    { id: 'SETTINGS', label: 'System Settings', icon: 'settings' },
    { id: 'LOGISTICS_UTILITY', label: 'Logistics Utility', icon: 'local_shipping' },
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

  // Mobile Backdrop
  const Backdrop = () => (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={() => setIsMobileMenuOpen(false)}
    ></div>
  );

  return (
    <>
      <Backdrop />
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
        fixed inset-y-0 left-0 z-50 overflow-hidden shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]
        md:relative md:translate-x-0 
        ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:w-20'} 
        ${isHovered && !isMobileMenuOpen ? 'md:w-72' : ''}
        flex-shrink-0 flex flex-col bg-[var(--bg-panel)] backdrop-blur-xl border-r border-[var(--border-color)]
      `}
      >
        {/* Header Profile Section */}
        <div
          onClick={() => onNavigate('PROFILE')}
          className={`h-20 flex items-center ${isHovered || isMobileMenuOpen ? 'gap-2 px-4' : 'justify-center px-0'} border-b border-white/5 flex-shrink-0 bg-forest-900/20 cursor-pointer hover:bg-white/5 transition-all group`}
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

          {/* Text Details - Only Visible on Hover or Mobile Open */}
          <div className={`flex flex-col transition-opacity duration-200 ${isHovered || isMobileMenuOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
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
              title={(!isHovered && !isMobileMenuOpen) ? item.label : ''}
              className={`flex w-full items-center ${isHovered || isMobileMenuOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3.5 rounded-xl transition-all group relative overflow-hidden ${activePage === item.id
                ? 'bg-forest-800 text-gold-400 border border-gold-400/10 shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              {activePage === item.id && (isHovered || isMobileMenuOpen) && (
                <span className="absolute left-0 top-3 bottom-3 w-1 bg-gold-400 rounded-r-full"></span>
              )}
              <span className={`material-symbols-outlined text-[24px] transition-colors ${activePage === item.id ? 'text-gold-400' : 'text-gray-500 group-hover:text-gold-400'
                }`}>
                {item.icon}
              </span>

              <span className={`text-xs font-bold tracking-wide whitespace-nowrap transition-all duration-300 ${isHovered || isMobileMenuOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0'}`}>
                {item.label}
              </span>

              {item.badge && (isHovered || isMobileMenuOpen) && (
                <span className="ml-auto bg-gold-500 text-forest-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                  {item.badge}
                </span>
              )}
              {item.badge && (!isHovered && !isMobileMenuOpen) && (
                <span className="absolute top-2 right-4 w-2 h-2 bg-gold-500 rounded-full"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full flex items-center ${isHovered || isMobileMenuOpen ? 'justify-start gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl bg-white/5 border border-white/5 text-gray-500 hover:text-white hover:bg-red-500/10 hover:border-red-500/30 transition-all font-black text-[10px] uppercase tracking-[0.25em]`}
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span className={`transition-all duration-300 ${isHovered || isMobileMenuOpen ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0 overflow-hidden'}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all scale-100">
            <div className="p-6 text-center">
              <div className="size-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <span className="material-symbols-outlined text-3xl text-red-500">logout</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Logout Confirmation</h3>
              <p className="text-sm text-gray-400">
                Do you want to logout?
              </p>
            </div>

            <div className="p-4 border-t border-white/5 bg-black/20 flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all font-bold text-xs uppercase tracking-wider"
              >
                No
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 transition-all font-bold text-xs uppercase tracking-wider"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
