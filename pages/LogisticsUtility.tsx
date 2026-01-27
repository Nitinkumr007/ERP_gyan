import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { DemandDispatchMaster, UserAccessMaster } from '../types';

interface LogisticsUtilityProps {
    currentUser: UserAccessMaster | null;
}

type ViewState = 'PLANT' | 'RSM' | 'DISTRIBUTOR' | 'ORDER_LIST';

const LogisticsUtility: React.FC<LogisticsUtilityProps> = ({ currentUser }) => {
    // Data State
    const [rawData, setRawData] = useState<DemandDispatchMaster[]>([]);
    const [loading, setLoading] = useState(true);

    // Navigation State
    const [view, setView] = useState<ViewState>('PLANT');
    const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
    const [selectedRSM, setSelectedRSM] = useState<string | null>(null);
    const [selectedDistributorId, setSelectedDistributorId] = useState<number | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<DemandDispatchMaster | null>(null); // For Modal

    // Initial Fetch & Realtime Subscription
    useEffect(() => {
        if (!currentUser) return;

        fetchDemands();

        const channel = supabase
            .channel('logistics-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'demand_dispatch_master'
                },
                (payload) => {
                    // Optional: Check if the change is relevant to avoiding unnecessary refetches
                    // For now, simple refresh is robust
                    fetchDemands();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    const fetchDemands = async () => {
        setLoading(true);
        if (!currentUser) return;

        try {
            // 1. Determine Access Level directly
            const isAdmin = currentUser.role === 'Admin' || currentUser.emp_designation?.toLowerCase().includes('admin');

            let allowedUserIds: number[] = [currentUser.user_id]; // Always include self

            // 2. If NOT Admin, find downstream users (e.g. AGM -> RSMs)
            if (!isAdmin) {
                // Fetch users who report to me (currentUser.emp_id)
                const { data: teamData, error: teamError } = await supabase
                    .from('user_access_master')
                    .select('user_id')
                    .eq('reporting_manager_id', currentUser.emp_id);

                if (teamData) {
                    allowedUserIds = [...allowedUserIds, ...teamData.map(u => u.user_id)];
                }
            }

            // 3. Fetch Demands
            let query = supabase
                .from('demand_dispatch_master')
                .select('*')
                .neq('payment_status', 'Dispatched')
                .order('created_at', { ascending: false });

            // 4. Apply Filters if NOT Admin
            if (!isAdmin) {
                // We want demands where RSM OR ASM is in our allowed list
                // Supabase doesn't support generic "OR" across columns easily in one chained call with ".in()" 
                // easily combined with other logic without raw SQL or 'or' syntax:
                // .or(`rsm_id.in.(${ids}),asm_id.in.(${ids})`)
                // Stringifying the array for the OR filter:
                const idsStr = `(${allowedUserIds.join(',')})`;
                query = query.or(`rsm_id.in.${idsStr},asm_id.in.${idsStr}`);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching demands:", error);
            } else {
                setRawData(data || []);
            }

        } catch (err) {
            console.error("Unexpected error in fetchDemands:", err);
        } finally {
            setLoading(false);
        }
    };

    // --- AGGREGATIONS ---

    const plants = useMemo(() => {
        const map = new Map<string, { name: string; totalMT: number; orders: number }>();
        rawData.forEach(item => {
            const name = item.plant_name || 'Unknown Plant';
            const curr = map.get(name) || { name, totalMT: 0, orders: 0 };
            curr.totalMT += item.total_in_mt || 0;
            curr.orders += 1;
            map.set(name, curr);
        });
        return Array.from(map.values());
    }, [rawData]);

    const rsms = useMemo(() => {
        if (!selectedPlant) return [];
        const filtered = rawData.filter(d => d.plant_name === selectedPlant);
        const map = new Map<string, { id: number; name: string; totalMT: number; orders: number }>();
        filtered.forEach(item => {
            const name = item.rsm_name || 'Unassigned';
            const id = item.rsm_id || 0;
            const key = `${id}-${name}`;
            const curr = map.get(key) || { id, name, totalMT: 0, orders: 0 };
            curr.totalMT += item.total_in_mt || 0;
            curr.orders += 1;
            map.set(key, curr);
        });
        return Array.from(map.values());
    }, [rawData, selectedPlant]);

    const distributors = useMemo(() => {
        if (!selectedPlant || !selectedRSM) return [];
        const filtered = rawData.filter(d =>
            d.plant_name === selectedPlant &&
            (d.rsm_name === selectedRSM || (selectedRSM === 'Unassigned' && !d.rsm_name))
        );
        const map = new Map<number, { id: number; name: string; totalMT: number; orders: number }>();
        filtered.forEach(item => {
            const id = item.db_id || 0;
            const name = item.db_name || 'Unknown DB';
            const curr = map.get(id) || { id, name, totalMT: 0, orders: 0 };
            curr.totalMT += item.total_in_mt || 0;
            curr.orders += 1;
            map.set(id, curr);
        });
        return Array.from(map.values());
    }, [rawData, selectedPlant, selectedRSM]);

    const orders = useMemo(() => {
        if (!selectedPlant || !selectedRSM || !selectedDistributorId) return [];
        return rawData.filter(d =>
            d.plant_name === selectedPlant &&
            (d.rsm_name === selectedRSM || (selectedRSM === 'Unassigned' && !d.rsm_name)) &&
            d.db_id === selectedDistributorId
        );
    }, [rawData, selectedPlant, selectedRSM, selectedDistributorId]);


    // --- ACTIONS ---

    const handleCopy = (order: DemandDispatchMaster) => {
        // Construct the detailed string
        const lines = [
            `Distributor: ${order.db_name} (${order.db_id})`,
            `Order ID: ${order.order_id}`,
            `Priority: ${order.dispatch_priority || 'N/A'}`,
            `Transport: ${order.transporter_name || 'N/A'}`,
            `Vehicle: ${order.vehicle_number || 'N/A'}`,
            ``,
            `Location: ${order.location || order.district || 'N/A'}`,
        ];

        // Helper to add product line if > 0
        const addProd = (name: string, qty: number | null) => {
            if (qty && qty > 0) lines.push(`  ${name}: ${qty}`);
        };

        addProd('Supreme - 50 Kg', order.supreme_50kg);
        addProd('Supreme - 25 Kg', order.supreme_25kg);
        addProd('Gold Pro - 50 Kg', order.gold_pro_50kg);
        addProd('Gold Pro - 25 Kg', order.gold_pro_25kg);
        addProd('Doodh Plus - 50 Kg', order.doodh_plus_50kg);
        addProd('Doodh Plus - 25 Kg', order.doodh_plus_25kg);
        addProd('Bhains Special - 50 Kg', order.bhains_special_50kg);
        addProd('Diamond Pro - 50 Kg', order.diamond_pro_50kg);
        addProd('Transition Feed - 25 Kg', order.transition_feed_25kg);
        addProd('Calf Starter - 5Kg', order.calf_starter_5kg);
        addProd('CMM Red - 10Kg', order.cmm_red_10kg);
        addProd('CMM Premium - 10Kg', order.cmm_premium_10kg);
        addProd('Milk Maxima - 20L', order.milk_maxima_20ltrs);
        addProd('Milk Maxima - 10L', order.milk_maxima_10ltrs);
        addProd('Batisa Gold - 20g', order.batisa_gold_20gms);
        // ... add others as needed based on common updates

        lines.push(``);
        lines.push(`Total MT: ${order.total_in_mt?.toFixed(2)}`);

        const text = lines.join('\n');
        navigator.clipboard.writeText(text).then(() => {
            alert("Order details copied to clipboard!");
        });
    };

    const handleDispatch = async (orderId: number) => {
        if (!confirm("Confirm marking this order as Dispatched? It will be removed from this list.")) return;

        const { error } = await supabase
            .from('demand_dispatch_master')
            .update({ payment_status: 'Dispatched' }) // Assuming this status removes it from queue
            .eq('order_id', orderId);

        if (error) {
            alert("Error updating order: " + error.message);
        } else {
            // Remove locally
            setRawData(prev => prev.filter(o => o.order_id !== orderId));
            if (selectedOrder?.order_id === orderId) setSelectedOrder(null);
            if (orders.length === 1) {
                // If this was the last order, go back
                setView('DISTRIBUTOR');
            }
        }
    };


    // --- RENDER HELPERS ---

    const Breadcrumbs = () => (
        <div className="flex items-center gap-2 text-sm mb-6 text-gray-500 overflow-x-auto whitespace-nowrap">
            <span
                className={`cursor-pointer hover:text-[var(--color-primary)] ${view === 'PLANT' ? 'font-bold text-[var(--color-primary)]' : ''}`}
                onClick={() => { setView('PLANT'); setSelectedPlant(null); setSelectedRSM(null); setSelectedDistributorId(null); }}
            >
                All Plants
            </span>
            {selectedPlant && (
                <>
                    <span>/</span>
                    <span
                        className={`cursor-pointer hover:text-[var(--color-primary)] ${view === 'RSM' ? 'font-bold text-[var(--color-primary)]' : ''}`}
                        onClick={() => { setView('RSM'); setSelectedRSM(null); setSelectedDistributorId(null); }}
                    >
                        {selectedPlant}
                    </span>
                </>
            )}
            {selectedRSM && (
                <>
                    <span>/</span>
                    <span
                        className={`cursor-pointer hover:text-[var(--color-primary)] ${view === 'DISTRIBUTOR' ? 'font-bold text-[var(--color-primary)]' : ''}`}
                        onClick={() => { setView('DISTRIBUTOR'); setSelectedDistributorId(null); }}
                    >
                        {selectedRSM}
                    </span>
                </>
            )}
            {selectedDistributorId && orders.length > 0 && (
                <>
                    <span>/</span>
                    <span className="font-bold text-[var(--color-primary)]">
                        {orders[0].db_name}
                    </span>
                </>
            )}
        </div>
    );

    if (!currentUser) {
        return <div className="p-8 text-center text-gray-500">Loading user context...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)] p-6 md:p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3">
                    <span className="material-symbols-outlined text-3xl text-[var(--color-primary)]">local_shipping</span>
                    Logistics Dispatch Utility
                </h1>
                {!loading && rawData.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="bg-green-500/10 text-green-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full border border-green-500/20 flex items-center gap-1 animate-pulse">
                            <span className="size-1.5 rounded-full bg-green-500"></span>
                            Live
                        </span>
                        <span className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs px-3 py-1 rounded-full border border-[var(--border-color)]">
                            Showing {rawData.length} pending orders
                        </span>
                    </div>
                )}
            </div>


            <Breadcrumbs />

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary)]"></div>
                </div>
            ) : (
                <>
                    {/* PLANT VIEW */}
                    {view === 'PLANT' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plants.length > 0 ? plants.map(plant => (
                                <div
                                    key={plant.name}
                                    onClick={() => { setSelectedPlant(plant.name); setView('RSM'); }}
                                    className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl p-6 hover:shadow-lg hover:border-[var(--color-primary)] cursor-pointer transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-[var(--text-primary)]">{plant.name}</h3>
                                        <div className="size-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                                            <span className="material-symbols-outlined">factory</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-bold">Orders</p>
                                            <p className="text-2xl font-bold text-[var(--text-primary)]">{plant.orders}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-bold">Total MT</p>
                                            <p className="text-2xl font-black text-[var(--color-primary)]">{plant.totalMT.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <button className="w-full mt-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                        Open Plant
                                    </button>
                                </div>
                            )) : (
                                <div className="col-span-3 text-center py-12 text-[var(--text-secondary)]">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
                                    <p>No pending orders found for your hierarchy.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* RSM VIEW */}
                    {view === 'RSM' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rsms.map(rsm => (
                                <div
                                    key={rsm.id}
                                    onClick={() => { setSelectedRSM(rsm.name); setView('DISTRIBUTOR'); }}
                                    className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl p-6 hover:shadow-lg hover:border-[var(--color-primary)] cursor-pointer transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-bold text-[var(--text-primary)]">{rsm.name}</h3>
                                        <span className="bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full text-xs font-bold">RSM</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-bold">Orders</p>
                                            <p className="text-xl font-bold text-[var(--text-primary)]">{rsm.orders}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-bold">Load (MT)</p>
                                            <p className="text-xl font-black text-[var(--color-primary)]">{rsm.totalMT.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <button className="w-full mt-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg font-bold group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                                        View Distributors
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* DISTRIBUTOR VIEW */}
                    {view === 'DISTRIBUTOR' && (
                        <div className="grid grid-cols-1 gap-4">
                            {distributors.map(dist => (
                                <div
                                    key={dist.id}
                                    onClick={() => { setSelectedDistributorId(dist.id); setView('ORDER_LIST'); }}
                                    className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 flex items-center justify-between hover:border-[var(--color-primary)] cursor-pointer transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="size-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--color-primary)]">
                                            <span className="material-symbols-outlined">store</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[var(--text-primary)]">{dist.name}</h3>
                                            <p className="text-xs text-[var(--text-secondary)]">ID: {dist.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold">Orders</p>
                                            <p className="font-bold text-[var(--text-primary)]">{dist.orders}</p>
                                        </div>
                                        <div className="text-right w-24">
                                            <p className="text-[10px] uppercase text-[var(--text-muted)] font-bold">Total MT</p>
                                            <p className="text-lg font-black text-[var(--color-primary)]">{dist.totalMT.toFixed(2)}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-[var(--text-muted)] group-hover:text-[var(--color-primary)]">chevron_right</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ORDER LIST VIEW */}
                    {view === 'ORDER_LIST' && (
                        <div className="grid grid-cols-1 gap-4">
                            {orders.map(order => (
                                <div
                                    key={order.order_id}
                                    className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 hover:shadow-md transition-all"
                                >
                                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-[var(--text-primary)] text-lg">Order #{order.order_id}</h3>
                                                {order.dispatch_priority === 'P1' && (
                                                    <span className="bg-red-500/10 text-red-500 text-xs px-2 py-0.5 rounded font-black">P1 URGENT</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] mt-1">
                                                {new Date(order.created_at || '').toLocaleDateString()} • {order.location || order.district}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="px-6 py-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                                        >
                                            View Details
                                        </button>
                                    </div>

                                    {/* Mini Summary */}
                                    <div className="bg-[var(--bg-secondary)] rounded-lg p-3 grid grid-cols-3 gap-4 text-xs">
                                        <div>
                                            <span className="block text-[var(--text-muted)] font-bold">Vehicle</span>
                                            <span className="text-[var(--text-primary)]">{order.vehicle_number || 'Pending'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-[var(--text-muted)] font-bold">Transport</span>
                                            <span className="text-[var(--text-primary)]">{order.transporter_name || 'Pending'}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-[var(--text-muted)] font-bold">Tonnage</span>
                                            <span className="text-base font-black text-[var(--text-primary)]">{order.total_in_mt} MT</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ORDER DETAIL MODAL */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slideIn">

                        {/* Header */}
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-start bg-[var(--bg-secondary)]/30">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">
                                    {selectedOrder.db_name} ({selectedOrder.db_id})
                                </h2>
                                <p className="text-sm text-[var(--text-secondary)]">
                                    Order ID: <span className="font-mono text-[var(--text-primary)]">{selectedOrder.order_id}</span> • {selectedOrder.plant_name}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="size-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                                    <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Priority</p>
                                    <p className={`font-bold ${selectedOrder.dispatch_priority === 'P1' ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                                        {selectedOrder.dispatch_priority || 'Standard'}
                                    </p>
                                </div>
                                <div className="p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                                    <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Location</p>
                                    <p className="font-bold text-[var(--text-primary)]">{selectedOrder.location || selectedOrder.district || 'N/A'}</p>
                                </div>
                                <div className="col-span-2 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                                    <p className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Logistics</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="font-bold text-[var(--text-primary)]">
                                            <span className="text-[var(--text-secondary)] font-normal mr-2">Transporter:</span>
                                            {selectedOrder.transporter_name || 'N/A'}
                                        </p>
                                        <p className="font-bold text-[var(--text-primary)]">
                                            <span className="text-[var(--text-secondary)] font-normal mr-2">Vehicle:</span>
                                            {selectedOrder.vehicle_number || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-sm font-black uppercase text-[var(--text-muted)] mb-3 tracking-wider">Product Breakdown</h3>
                            <div className="space-y-1">
                                {/* Only show products with quantity > 0 */}
                                {[
                                    { label: 'Supreme - 50 Kg', val: selectedOrder.supreme_50kg },
                                    { label: 'Supreme - 25 Kg', val: selectedOrder.supreme_25kg },
                                    { label: 'Gold Pro - 50 Kg', val: selectedOrder.gold_pro_50kg },
                                    { label: 'Doodh Plus - 50 Kg', val: selectedOrder.doodh_plus_50kg },
                                    { label: 'Doodh Plus - 25 Kg', val: selectedOrder.doodh_plus_25kg },
                                    // ... Add all mapped fields as needed ...
                                ].map(item => item.val && item.val > 0 ? (
                                    <div key={item.label} className="flex justify-between py-2 border-b border-[var(--border-color)] last:border-0 border-dashed">
                                        <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
                                        <span className="text-sm font-bold text-[var(--text-primary)]">{item.val}</span>
                                    </div>
                                ) : null)}
                            </div>

                            <div className="mt-4 pt-4 border-t-2 border-[var(--border-color)] flex justify-between items-center">
                                <span className="text-lg font-bold text-[var(--text-primary)]">Total Tonnage</span>
                                <span className="text-2xl font-black text-[var(--color-primary)]">{selectedOrder.total_in_mt} MT</span>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-[var(--border-color)] flex flex-col gap-3 bg-[var(--bg-secondary)]/30">
                            <button
                                onClick={() => handleCopy(selectedOrder)}
                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">content_copy</span>
                                Copy Details (WhatsApp Format)
                            </button>

                            <button
                                onClick={() => handleDispatch(selectedOrder.order_id)}
                                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined">check_circle</span>
                                Mark as Dispatched
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogisticsUtility;
