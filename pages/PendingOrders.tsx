import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { AppState, DemandDispatchMaster } from '../types';

interface PendingOrdersProps {
  onNavigate: (page: AppState) => void;
}

interface ProductConfig {
  key: keyof DemandDispatchMaster;
  label: string;
  weightV?: number; // Weight in kg
  isLiquid?: boolean;
}

const PRODUCTS: ProductConfig[] = [
  { key: 'supreme_50kg', label: 'Supreme 50kg', weightV: 50 },
  { key: 'supreme_25kg', label: 'Supreme 25kg', weightV: 25 },
  { key: 'gold_pro_50kg', label: 'Gold Pro 50kg', weightV: 50 },
  { key: 'gold_pro_25kg', label: 'Gold Pro 25kg', weightV: 25 },
  { key: 'doodh_plus_50kg', label: 'Doodh Plus 50kg', weightV: 50 },
  { key: 'doodh_plus_25kg', label: 'Doodh Plus 25kg', weightV: 25 },
  { key: 'bhains_special_50kg', label: 'Bhains Special 50kg', weightV: 50 },
  { key: 'diamond_pro_50kg', label: 'Diamond Pro 50kg', weightV: 50 },
  { key: 'transition_feed_25kg', label: 'Transition Feed 25kg', weightV: 25 },
  { key: 'calf_starter_5kg', label: 'Calf Starter 5kg', weightV: 5 },
  { key: 'cmm_red_10kg', label: 'CMM Red 10kg', weightV: 10 },
  { key: 'cmm_premium_10kg', label: 'CMM Premium 10kg', weightV: 10 },
  { key: 'milk_maxima_20ltrs', label: 'Milk Maxima 20L', isLiquid: true },
  { key: 'milk_maxima_10ltrs', label: 'Milk Maxima 10L', isLiquid: true },
  { key: 'milk_maxima_5x3ltrs', label: 'Milk Maxima 5x3L', isLiquid: true },
  { key: 'milk_maxima_1x16ltrs', label: 'Milk Maxima 1x16L', isLiquid: true },
  { key: 'milk_maxima_5x2ltrs', label: 'Milk Maxima 5x2L', isLiquid: true },
  { key: 'batisa_gold_20gms', label: 'Batisa Gold 20g' },
  { key: 'batisa_gold_100gms', label: 'Batisa Gold 100g' },
  { key: 'masti_shield_20x300gms', label: 'Masti Shield' },
  { key: 'snf_power_plus_20x500gms', label: 'SNF Power Plus' },
  { key: 'toxin_binder_20x500gms', label: 'Toxin Binder' },
  { key: 'utriclean_1x10_bottle', label: 'Utriclean' },
];

interface GroupedOrder {
  order_id: number;
  db_name: string;
  demand_date: string;
  total_mt: number;
  status: string; // "Mixed" if different, or the status if uniform
  locations: DemandDispatchMaster[];
}

const PendingOrders: React.FC<PendingOrdersProps> = ({ onNavigate }) => {
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [groupedOrders, setGroupedOrders] = useState<GroupedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit State
  const [editingData, setEditingData] = useState<Record<number, DemandDispatchMaster>>({});

  // Filters
  const [filters, setFilters] = useState({
    order_id: '',
    db_name: '',
    demand_date: '',
    status: ''
  });

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('demand_dispatch_master')
        .select('*')
        .not('payment_status', 'in', '("Paid","Completed")')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        groupAndSetOrders(data);
      }
    } catch (err: any) {
      console.error("Error fetching pending orders:", err);
      setError("Failed to load pending orders.");
    } finally {
      setLoading(false);
    }
  };

  const groupAndSetOrders = (data: DemandDispatchMaster[]) => {
    const groups: Record<number, GroupedOrder> = {};

    data.forEach(item => {
      if (!groups[item.order_id]) {
        groups[item.order_id] = {
          order_id: item.order_id,
          db_name: item.db_name || 'Unknown',
          demand_date: item.demand_date || '',
          total_mt: 0,
          status: item.payment_status || 'Pending',
          locations: []
        };
      }

      groups[item.order_id].locations.push(item);
      groups[item.order_id].total_mt += (item.total_in_mt || 0);

      // Update status logic if needed (e.g. valid 'Mixed' if mixed statuses)
      if (groups[item.order_id].status !== item.payment_status) {
        // simplified for now, keep first or mark mixed? 
        // Let's keep the latest one or similar.
      }
    });

    setGroupedOrders(Object.values(groups).sort((a, b) => b.order_id - a.order_id));
  };

  // Helper to calculate MT
  const calculateMT = (item: DemandDispatchMaster): number => {
    let mt = 0;
    PRODUCTS.forEach(prod => {
      if (prod.weightV && typeof item[prod.key] === 'number') {
        mt += ((item[prod.key] as number) * prod.weightV!) / 1000;
      }
    });
    return parseFloat(mt.toFixed(3));
  };

  const handleEditChange = (demand_id: number, key: keyof DemandDispatchMaster, value: any) => {
    setEditingData(prev => {
      const original = groupedOrders.flatMap(g => g.locations).find(l => l.demand_id === demand_id);
      const current = prev[demand_id] || { ...original };

      const updated = { ...current, [key]: value };

      // Recalculate MT if product changed
      if (PRODUCTS.some(p => p.key === key)) {
        updated.total_in_mt = calculateMT(updated);
      }

      return { ...prev, [demand_id]: updated };
    });
  };

  const saveLocation = async (demand_id: number) => {
    const dataToSave = editingData[demand_id];
    if (!dataToSave) return;

    try {
      const { error } = await supabase
        .from('demand_dispatch_master')
        .update(dataToSave)
        .eq('demand_id', demand_id);

      if (error) throw error;

      alert("Order updated successfully!");
      // Refresh local state without full refetch
      const updatedGroups = groupedOrders.map(group => ({
        ...group,
        locations: group.locations.map(loc => loc.demand_id === demand_id ? { ...loc, ...dataToSave } : loc),
        // re-sum group total
        total_mt: group.locations.reduce((sum, loc) => sum + (loc.demand_id === demand_id ? (dataToSave.total_in_mt || 0) : (loc.total_in_mt || 0)), 0)
      }));
      setGroupedOrders(updatedGroups);

      // Clear edit state for this item
      const newEditData = { ...editingData };
      delete newEditData[demand_id];
      setEditingData(newEditData);

    } catch (err) {
      console.error("Error saving:", err);
      alert("Failed to save changes.");
    }
  };

  const updateStatus = async (demand_id: number, status: string) => {
    // similar logic to save, update status field
    try {
      const { error } = await supabase
        .from('demand_dispatch_master')
        .update({ payment_status: status })
        .eq('demand_id', demand_id);

      if (error) throw error;

      fetchPendingOrders(); // easier to refetch for status sync
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };


  const deleteLocation = async (demand_id: number) => {
    if (!window.confirm("Are you sure you want to delete this location demand?")) return;

    try {
      const { error } = await supabase
        .from('demand_dispatch_master')
        .delete()
        .eq('demand_id', demand_id);

      if (error) throw error;

      // Refresh local state
      const updatedGroups = groupedOrders.map(group => ({
        ...group,
        locations: group.locations.filter(loc => loc.demand_id !== demand_id)
      })).filter(group => group.locations.length > 0); // Remove empty groups

      setGroupedOrders(updatedGroups);
    } catch (err) {
      console.error("Error deleting location:", err);
      alert("Failed to delete location.");
    }
  };

  const deleteOrder = async (order_id: number) => {
    if (!window.confirm(`Are you sure you want to delete entire Order #${order_id}? This will remove all locations.`)) return;

    try {
      const { error } = await supabase
        .from('demand_dispatch_master')
        .delete()
        .eq('order_id', order_id);

      if (error) throw error;

      setGroupedOrders(prev => prev.filter(g => g.order_id !== order_id));
    } catch (err) {
      console.error("Error deleting order:", err);
      alert("Failed to delete order.");
    }
  };

  const filteredGroups = groupedOrders.filter(group => {
    // Check main group fields
    const matchGroup =
      (filters.order_id === '' || group.order_id.toString().includes(filters.order_id)) &&
      (filters.db_name === '' || group.db_name.toLowerCase().includes(filters.db_name.toLowerCase())) &&
      (filters.demand_date === '' || group.demand_date.includes(filters.demand_date));

    if (!matchGroup) return false;

    // Additional check: if status filter is applied, check if ANY location matches
    if (filters.status !== '') {
      return group.locations.some(l => l.payment_status?.toLowerCase().includes(filters.status.toLowerCase()));
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[var(--color-primary)] text-sm font-bold uppercase tracking-widest">
          <span className="h-px w-8 bg-[var(--color-primary)]"></span> Logistics Hub
        </div>
        <div className="flex justify-between items-end">
          <h1 className="text-[var(--text-primary)] text-4xl font-black leading-tight tracking-tight">Pending Orders</h1>
          <div className="flex gap-2">
            <button onClick={fetchPendingOrders} className="flex items-center justify-center rounded-lg h-10 px-4 bg-[var(--bg-panel)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs font-bold border border-[var(--border-color)] transition-colors shadow-sm">
              <span className="material-symbols-outlined mr-2 text-[18px]">refresh</span>
              Refresh
            </button>
            <button onClick={() => onNavigate('ADD_DEMAND')} className="flex items-center justify-center rounded-lg h-10 px-6 bg-[var(--color-primary)] text-white text-xs font-bold transition-all hover:opacity-90 shadow-lg hover:shadow-blue-500/20">
              <span className="material-symbols-outlined mr-2 text-[20px]">add</span>
              Create Demand
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[var(--bg-panel)] p-4 rounded-2xl border border-[var(--border-color)] shadow-sm">
        <input
          placeholder="Search Order ID..."
          value={filters.order_id}
          onChange={e => setFilters(prev => ({ ...prev, order_id: e.target.value }))}
          className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
        />
        <input
          placeholder="Search Distributor..."
          value={filters.db_name}
          onChange={e => setFilters(prev => ({ ...prev, db_name: e.target.value }))}
          className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
        />
        <input
          type="date"
          value={filters.demand_date}
          onChange={e => setFilters(prev => ({ ...prev, demand_date: e.target.value }))}
          className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
        />
        <input
          placeholder="Filter Status..."
          value={filters.status}
          onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-[var(--text-muted)]">Loading orders...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">No orders found matching filters.</div>
        ) : (
          filteredGroups.map(group => (
            <div key={group.order_id} className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm transition-all hover:shadow-md">
              {/* Group Header */}
              <div
                onClick={() => setExpandedOrderId(expandedOrderId === group.order_id ? null : group.order_id)}
                className={`grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer transition-colors ${expandedOrderId === group.order_id ? 'bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-secondary)]'}`}
              >
                <div className="md:col-span-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--text-muted)]">{expandedOrderId === group.order_id ? 'expand_less' : 'expand_more'}</span>
                  <span className="font-bold text-[var(--text-primary)] text-lg">#{group.order_id}</span>
                </div>
                <div className="md:col-span-4 font-medium text-[var(--text-primary)]">
                  {group.db_name}
                  <div className="text-xs text-[var(--text-secondary)]">{group.locations.length} Locations</div>
                </div>
                <div className="md:col-span-2 text-sm text-[var(--text-secondary)]">{group.demand_date}</div>
                <div className="md:col-span-2 text-sm font-bold text-[var(--text-primary)]">{group.total_mt.toFixed(3)} MT</div>
                <div className="md:col-span-2 flex justify-end items-center gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${group.status === 'Completed' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                    {group.status}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteOrder(group.order_id); }}
                    className="p-1.5 text-red-500/70 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Entire Order"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                  </button>
                </div>
              </div>

              {/* Expanded Children */}
              {expandedOrderId === group.order_id && (
                <div className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/30 p-4 space-y-4">
                  {group.locations.map(location => {
                    const currentData = editingData[location.demand_id] || location;
                    const isEditing = !!editingData[location.demand_id];

                    return (
                      <div key={location.demand_id} className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-5 animate-fadeIn">
                        <div className="flex justify-between items-start mb-4 border-b border-[var(--border-color)] pb-3">
                          <div>
                            <h3 className="font-bold text-[var(--text-primary)] text-base">{location.location || 'Location Not Specified'}</h3>
                            <span className="text-xs text-[var(--text-secondary)]">Plant: {location.plant_name || 'Global'}</span>
                          </div>
                          <div className="flex gap-2">
                            {/* Action Buttons */}
                            <button
                              onClick={() => saveLocation(location.demand_id)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isEditing ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' : 'bg-[var(--bg-panel)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed'}`}
                              disabled={!isEditing}
                            >
                              <span className="material-symbols-outlined text-[16px]">save</span>
                              Save
                            </button>
                            <button
                              onClick={() => updateStatus(location.demand_id, 'Dispatched')}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-bold hover:opacity-90 shadow-lg shadow-blue-500/20"
                            >
                              <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                              Dispatch
                            </button>
                            <button
                              onClick={() => deleteLocation(location.demand_id)}
                              className="p-1.5 text-red-500/70 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Location"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Logistics Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">Vehicle No</label>
                            <input
                              value={currentData.vehicle_number || ''}
                              onChange={(e) => handleEditChange(location.demand_id, 'vehicle_number', e.target.value)}
                              className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-mono"
                              placeholder="Enter Vehicle No"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">Transporter</label>
                            <input
                              value={currentData.transporter_name || ''}
                              onChange={(e) => handleEditChange(location.demand_id, 'transporter_name', e.target.value)}
                              className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                              placeholder="Transporter Name"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1">Priority</label>
                            <select
                              value={currentData.dispatch_priority || 'Normal'}
                              onChange={(e) => handleEditChange(location.demand_id, 'dispatch_priority', e.target.value)}
                              className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                            >
                              <option>Normal</option>
                              <option>High</option>
                              <option>Urgent</option>
                            </select>
                          </div>
                        </div>

                        {/* Products Grid */}
                        <div className="bg-[var(--bg-panel)]/50 rounded-lg p-4 border border-[var(--border-color)]">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Product Quantities</h4>
                            <span className="text-sm font-black text-[var(--text-primary)]">Total: {currentData.total_in_mt?.toFixed(3)} MT</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {PRODUCTS.map(prod => (
                              <div key={prod.key} className="relative">
                                <label className="block text-[10px] text-[var(--text-secondary)] mb-1 truncate" title={prod.label}>{prod.label}</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={currentData[prod.key] as number || ''}
                                  onChange={(e) => handleEditChange(location.demand_id, prod.key, parseFloat(e.target.value) || 0)}
                                  className={`w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none ${currentData[prod.key] ? 'border-blue-500/30 bg-blue-500/5' : ''}`}
                                  placeholder="0"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PendingOrders;
