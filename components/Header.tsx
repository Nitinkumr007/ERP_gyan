
import React, { useState } from 'react';
import { AppState } from '../types';
import DatePicker from './DatePicker';

interface HeaderProps {
  activePage: AppState;
  isAdmin: boolean;
}

const Header: React.FC<HeaderProps> = ({ activePage, isAdmin }) => {
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  // Dashboard in user mode has its own built-in header for high visual fidelity
  if (activePage === 'DASHBOARD' && !isAdmin) {
    return null;
  }

  const pageTitles: Record<AppState, string> = {
    DASHBOARD: 'Admin Control Center',
    USER_MANAGEMENT: 'User Master Management',
    PRODUCT_MASTER: isAdmin ? 'Product Master Management' : 'Add New Demand',
    DISTRIBUTOR_CONTROL: 'Distributor Master',
    PENDING_ORDERS: 'Pending Orders Hub',
    ORDER_HISTORY: 'Order History',
    PARTNER_NETWORK: isAdmin ? 'Partner Network' : 'Your DB List',
    BALANCE_CHECK: 'DBR Balance Check',
    SETTINGS: 'System Configuration',
    LOGIN: '',
    PROFILE: 'My Profile'
  };

  const pageSubtitles: Record<AppState, string> = {
    DASHBOARD: 'System Status: Operational',
    USER_MANAGEMENT: 'Administration / User Master',
    PRODUCT_MASTER: isAdmin ? 'Configure global catalog' : 'Create new distribution requests',
    DISTRIBUTOR_CONTROL: 'Administration / Master List',
    PENDING_ORDERS: 'Review and authorize distribution network',
    ORDER_HISTORY: 'Track and manage past distributions',
    PARTNER_NETWORK: 'Connect and manage key relationships',
    BALANCE_CHECK: 'Financial Overview',
    SETTINGS: 'Configure global rules and preferences',
    LOGIN: '',
    PROFILE: 'Account Settings & Security'
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <header className="h-20 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-forest-950/50 backdrop-blur-md sticky top-0 z-50">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight leading-none mb-1">
          {pageTitles[activePage] || 'Demand App'}
        </h2>
        <p className={`text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 ${activePage === 'DASHBOARD' ? 'text-green-400' : 'text-gray-500'
          }`}>
          {activePage === 'DASHBOARD' && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
          )}
          {pageSubtitles[activePage]}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </span>
          <input
            className="w-64 bg-forest-800/40 border border-white/10 text-white text-xs rounded-full focus:ring-1 focus:ring-gold-400 focus:border-gold-400 block pl-10 p-2.5 placeholder-gray-500 transition-all outline-none"
            placeholder="Search dataset..."
            type="text"
          />
        </div>

        <button className="relative p-2.5 text-gray-500 hover:text-white transition-colors rounded-xl bg-forest-800/20 border border-white/5 group">
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500"></span>
          </span>
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">notifications</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-forest-800/40 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-gold-400/30 transition-all shadow-lg text-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <span>{formatDate(date)}</span>
            <span className="material-symbols-outlined text-[16px] opacity-40">expand_more</span>
          </button>

          {showCalendar && (
            <DatePicker
              selectedDate={date}
              onChange={setDate}
              onClose={() => setShowCalendar(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
