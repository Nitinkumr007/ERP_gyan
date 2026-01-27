
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { DemandDispatchMaster } from '../types';

interface ProductConfig {
  key: keyof DemandDispatchMaster;
  label: string;
}

const PRODUCTS: ProductConfig[] = [
  { key: 'supreme_50kg', label: 'Supreme 50kg' },
  { key: 'supreme_25kg', label: 'Supreme 25kg' },
  { key: 'gold_pro_50kg', label: 'Gold Pro 50kg' },
  { key: 'gold_pro_25kg', label: 'Gold Pro 25kg' },
  { key: 'doodh_plus_50kg', label: 'Doodh Plus 50kg' },
  { key: 'doodh_plus_25kg', label: 'Doodh Plus 25kg' },
  { key: 'bhains_special_50kg', label: 'Bhains Special 50kg' },
  { key: 'diamond_pro_50kg', label: 'Diamond Pro 50kg' },
  { key: 'transition_feed_25kg', label: 'Transition Feed 25kg' },
  { key: 'calf_starter_5kg', label: 'Calf Starter 5kg' },
  { key: 'cmm_red_10kg', label: 'CMM Red 10kg' },
  { key: 'cmm_premium_10kg', label: 'CMM Premium 10kg' },
  { key: 'milk_maxima_20ltrs', label: 'Milk Maxima 20L' },
  { key: 'milk_maxima_10ltrs', label: 'Milk Maxima 10L' },
  { key: 'milk_maxima_5x3ltrs', label: 'Milk Maxima 5x3L' },
  { key: 'milk_maxima_1x16ltrs', label: 'Milk Maxima 1x16L' },
  { key: 'milk_maxima_5x2ltrs', label: 'Milk Maxima 5x2L' },
  { key: 'batisa_gold_20gms', label: 'Batisa Gold 20g' },
  { key: 'batisa_gold_100gms', label: 'Batisa Gold 100g' },
  { key: 'masti_shield_20x300gms', label: 'Masti Shield' },
  { key: 'snf_power_plus_20x500gms', label: 'SNF Power Plus' },
  { key: 'toxin_binder_20x500gms', label: 'Toxin Binder' },
  { key: 'utriclean_1x10_bottle', label: 'Utriclean' },
];

const OrderHistory: React.FC = () => {
  const [history, setHistory] = useState<DemandDispatchMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    order_id: '',
    db_name: '',
    demand_date: '',
    status: ''
  });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('demand_dispatch_master')
        .select('*')
        .order('created_at', { ascending: false });

      if (startDate && endDate) {
        query = query.gte('demand_date', startDate).lte('demand_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) setHistory(data);
    } catch (err) {
      console.error("Error fetching order history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredHistory = history.filter(order => {
    if (filters.order_id && !order.order_id.toString().includes(filters.order_id)) return false;
    if (filters.db_name && !order.db_name?.toLowerCase().includes(filters.db_name.toLowerCase())) return false;
    if (filters.demand_date && !order.demand_date?.includes(filters.demand_date)) return false;
    if (filters.status && !order.payment_status?.toLowerCase().includes(filters.status.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] shadow-sm">
            <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl">history</span>
          </div>
          <div>
            <h2 className="text-[var(--text-primary)] text-3xl font-black tracking-tight leading-tight">Order History</h2>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]/70 font-bold uppercase tracking-[0.2em] text-[10px]">
              Archive & Reports
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[var(--bg-panel)] border border-[var(--border-color)] p-2 rounded-xl shadow-sm w-full md:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none w-full sm:w-auto"
          />
          <span className="text-[var(--text-muted)] text-center hidden sm:block">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none w-full sm:w-auto"
          />
          <button
            onClick={fetchHistory}
            className="size-8 flex items-center justify-center bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-all w-full sm:w-8 mt-2 sm:mt-0"
          >
            <span className="material-symbols-outlined text-sm">filter_list</span>
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col overflow-hidden flex-1 min-h-0">

        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-20 bg-[var(--bg-panel)] shadow-sm">
              <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Order Date</th>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Distributor</th>
                <th className="px-6 py-4 text-center">Calculated Vol</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
              {/* Filter Row */}
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                <th className="px-4 py-2">
                  <input
                    type="date"
                    value={filters.demand_date}
                    onChange={(e) => handleFilterChange('demand_date', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </th>
                <th className="px-4 py-2">
                  <input
                    placeholder="Filter ID..."
                    value={filters.order_id}
                    onChange={(e) => handleFilterChange('order_id', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </th>
                <th className="px-4 py-2">
                  <input
                    placeholder="Filter Name..."
                    value={filters.db_name}
                    onChange={(e) => handleFilterChange('db_name', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2">
                  <input
                    placeholder="Status..."
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                  />
                </th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-[var(--text-muted)]">Loading archive...</td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-[var(--text-muted)]">No orders found in history.</td>
                </tr>
              ) : (filteredHistory.map((order) => (
                <React.Fragment key={order.demand_id}>
                  <tr
                    className={`group hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer ${expandedId === order.demand_id ? 'bg-[var(--bg-secondary)]' : ''}`}
                    onClick={() => setExpandedId(expandedId === order.demand_id ? null : order.demand_id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[var(--text-primary)]">{order.demand_date}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">{order.demand_time}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-[var(--color-primary)]">#{order.order_id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] font-bold text-xs">
                          {order.db_name?.substring(0, 2).toUpperCase() || 'DB'}
                        </div>
                        <span className="text-sm font-semibold text-[var(--text-primary)]/90">{order.db_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-[var(--text-primary)]">{order.total_in_mt} MT</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${order.payment_status === 'Dispatched' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                        order.payment_status === 'Approved' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                        {order.payment_status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="bg-[var(--bg-primary)] border border-[var(--border-color)] group-hover:bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--text-primary)] shadow-sm transition-all">
                        {expandedId === order.demand_id ? 'Close' : 'View'}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded View */}
                  {expandedId === order.demand_id && (
                    <tr className="bg-[var(--bg-secondary)]/30">
                      <td colSpan={6} className="px-6 pb-6 pt-0">
                        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] p-6 shadow-sm animate-fadeIn">
                          <div className="flex justify-between items-start mb-6 border-b border-[var(--border-color)] pb-4">
                            <div>
                              <h3 className="font-bold text-lg text-[var(--text-primary)]">Order Details</h3>
                              <div className="flex gap-4 mt-2 text-xs text-[var(--text-secondary)]">
                                <span><strong className="text-[var(--text-primary)]">Location:</strong> {order.location || 'N/A'}</span>
                                <span><strong className="text-[var(--text-primary)]">Plant:</strong> {order.plant_name || 'N/A'}</span>
                                <span><strong className="text-[var(--text-primary)]">Vehicle:</strong> {order.vehicle_number || 'N/A'}</span>
                                <span><strong className="text-[var(--text-primary)]">Transporter:</strong> {order.transporter_name || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-bold">Total Volume</div>
                              <div className="text-2xl font-black text-[var(--color-primary)]">{order.total_in_mt} MT</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {PRODUCTS.filter(p => !!order[p.key]).map(prod => (
                              <div key={prod.key} className="bg-[var(--bg-panel)] rounded-lg p-3 border border-[var(--border-color)] flex flex-col">
                                <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">{prod.label}</span>
                                <span className="text-sm font-bold text-[var(--text-primary)]">{order[prod.key] as number}</span>
                              </div>
                            ))}
                            {PRODUCTS.every(p => !order[p.key]) && (
                              <div className="col-span-full text-center py-4 text-[var(--text-muted)] text-sm">No specific product quantities recorded.</div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;
