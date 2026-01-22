
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { AppState, DemandDispatchMaster, Distributor } from '../types';

interface AddDemandProps {
    onNavigate: (page: AppState) => void;
}

interface ProductConfig {
    key: keyof DemandDispatchMaster;
    label: string;
    weightV?: number;
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

const AddDemand: React.FC<AddDemandProps> = ({ onNavigate }) => {
    const [step, setStep] = useState(1);
    const [distributors, setDistributors] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Step 1: Distributor & Main Details
    const [selectedDistributor, setSelectedDistributor] = useState<any | null>(null);
    const [dispatchType, setDispatchType] = useState<'Transporter' | 'Self'>('Transporter');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [transporterName, setTransporterName] = useState('');

    // Step 2 & 3: Location Loop
    const [currentLocation, setCurrentLocation] = useState('');
    const [currentPlant, setCurrentPlant] = useState('');
    const [currentPriority, setCurrentPriority] = useState('P1');
    const [currentProducts, setCurrentProducts] = useState<Record<string, number>>({});

    // Queue
    const [demandQueue, setDemandQueue] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchDistributors();
    }, []);

    const fetchDistributors = async () => {
        const { data } = await supabase.from('Distributor_Master').select('*');
        if (data) setDistributors(data);
    };

    const filteredDistributors = distributors.filter(d =>
        d['NAME OF DISTRIBUTOR']?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d['DB ID']?.toString().includes(searchQuery)
    );

    const handleSelectDistributor = (dist: any) => {
        setSelectedDistributor(dist);
        setCurrentPlant(dist['PLANT'] || '');
        setTransporterName('Gyandhara Logistics'); // Default
        setStep(2);
    };

    const handleAddToQueue = () => {
        if (!currentLocation) {
            alert("Please enter a location name.");
            return;
        }

        // Calculate MT (simplified)
        let mt = 0;
        PRODUCTS.forEach(p => {
            if (p.weightV && currentProducts[p.key]) {
                mt += (currentProducts[p.key] * p.weightV) / 1000;
            }
        });

        const newItem = {
            location: currentLocation,
            plant: currentPlant,
            priority: currentPriority,
            products: { ...currentProducts },
            total_mt: parseFloat(mt.toFixed(3)),
            id: Date.now()
        };

        setDemandQueue([...demandQueue, newItem]);

        // Reset for next location
        setCurrentLocation('');
        setCurrentProducts({});
        setCurrentPriority('P1');
    };

    const handleRemoveFromQueue = (id: number) => {
        setDemandQueue(demandQueue.filter(item => item.id !== id));
    };

    const handleSubmitAll = async () => {
        if (demandQueue.length === 0) return;
        setIsSubmitting(true);

        try {
            // Generate a single Order ID for the batch
            // In a real app, maybe fetch max order_id + 1, or use a specific function
            // For now, let's use timestamp-based pseudo ID for demo or fetch
            const { data: maxData } = await supabase.from('demand_dispatch_master').select('order_id').order('order_id', { ascending: false }).limit(1);
            const nextOrderId = (maxData && maxData[0]?.order_id ? maxData[0].order_id : 1000) + 1;

            const rowsToInsert = demandQueue.map(item => {
                const row: any = {
                    order_id: nextOrderId,
                    db_id: selectedDistributor['DB ID'],
                    db_name: selectedDistributor['NAME OF DISTRIBUTOR'],
                    rsm_name: selectedDistributor['RSM'],
                    asm_name: selectedDistributor['ASM'],
                    district: selectedDistributor['DISTRICT'],
                    location: item.location,
                    plant_name: item.plant,
                    payment_status: 'Pending',
                    dispatch_priority: item.priority,
                    vehicle_number: dispatchType === 'Self' ? vehicleNumber : null,
                    transporter_name: dispatchType === 'Transporter' ? transporterName : 'Self',
                    total_in_mt: item.total_mt,
                    demand_date: new Date().toISOString().split('T')[0],
                    created_at: new Date().toISOString(),
                    ...item.products
                };
                return row;
            });

            const { error } = await supabase.from('demand_dispatch_master').insert(rowsToInsert);

            if (error) throw error;

            alert(`Order #${nextOrderId} created successfully!`);
            onNavigate('PENDING_ORDERS');

        } catch (err: any) {
            console.error("Submission error:", err);
            alert("Failed to minimize order: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-20">

            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => onNavigate('PENDING_ORDERS')} className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <div className="flex items-center gap-2 text-[var(--color-primary)] text-sm font-bold uppercase tracking-widest">
                        <span className="h-px w-8 bg-[var(--color-primary)]"></span> New Demand
                    </div>
                    <h1 className="text-[var(--text-primary)] text-3xl font-black">Create Order Wizard</h1>
                </div>
            </div>

            {/* Steps Indicator */}
            <div className="flex items-center gap-4 text-sm font-bold text-[var(--text-secondary)]">
                <span className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--bg-panel)]'}`}>1. Distributor</span>
                <span className="h-px w-8 bg-[var(--border-color)]"></span>
                <span className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--bg-panel)]'}`}>2. Details</span>
                <span className="h-px w-8 bg-[var(--border-color)]"></span>
                <span className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--bg-panel)]'}`}>3. Review</span>
            </div>

            {/* Step 1: Distributor Selection */}
            {step === 1 && (
                <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] p-8 shadow-sm space-y-6">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Select Distributor</h2>
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search by Name or Code..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-lg text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    />

                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar border border-[var(--border-color)] rounded-xl divide-y divide-[var(--border-color)]">
                        {filteredDistributors.length === 0 && <div className="p-4 text-[var(--text-muted)] text-center">No distributors found.</div>}
                        {filteredDistributors.map((dist) => (
                            <div
                                key={dist['DB ID']}
                                onClick={() => handleSelectDistributor(dist)}
                                className="p-4 hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors flex justify-between items-center"
                            >
                                <div>
                                    <div className="font-bold text-[var(--text-primary)]">{dist['NAME OF DISTRIBUTOR']}</div>
                                    <div className="text-xs text-[var(--text-secondary)]">Code: {dist['DB ID']} | District: {dist['DISTRICT']}</div>
                                </div>
                                <span className="material-symbols-outlined text-[var(--text-muted)]">chevron_right</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Main Logic */}
            {step === 2 && selectedDistributor && (
                <div className="space-y-6">
                    {/* Distributor Summary Card */}
                    <div className="bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] rounded-xl p-4 flex gap-6 items-center">
                        <div className="size-12 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-black text-xl">
                            {selectedDistributor['NAME OF DISTRIBUTOR']?.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-[var(--text-primary)] text-lg">{selectedDistributor['NAME OF DISTRIBUTOR']}</h3>
                            <div className="text-sm text-[var(--text-secondary)]">Plant: <span className="text-[var(--text-primary)] font-semibold">{currentPlant}</span> | District: {selectedDistributor['DISTRICT']}</div>
                        </div>
                        <button onClick={() => { setStep(1); setDemandQueue([]); }} className="ml-auto text-xs font-bold text-[var(--color-primary)] hover:underline">Change</button>
                    </div>

                    {/* Dispatch Config */}
                    <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border-color)] p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Dispatch Type</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDispatchType('Transporter')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${dispatchType === 'Transporter' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]'}`}
                                >
                                    Transporter
                                </button>
                                <button
                                    onClick={() => setDispatchType('Self')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${dispatchType === 'Self' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]'}`}
                                >
                                    Self Vehicle
                                </button>
                            </div>
                        </div>

                        {dispatchType === 'Self' && (
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Vehicle Number</label>
                                <input
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                                    placeholder="MH-XX-XX-XXXX"
                                />
                            </div>
                        )}
                        {dispatchType === 'Transporter' && (
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Transporter Name</label>
                                <input
                                    value={transporterName}
                                    onChange={(e) => setTransporterName(e.target.value)}
                                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                                />
                            </div>
                        )}
                    </div>

                    {/* Add Location Form */}
                    <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] p-6 shadow-lg shadow-black/5">
                        <h3 className="font-bold text-[var(--text-primary)] mb-4 text-lg border-b border-[var(--border-color)] pb-2">Add Location Demand</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Location Name</label>
                                <input
                                    value={currentLocation}
                                    onChange={e => setCurrentLocation(e.target.value)}
                                    placeholder="Enter City/Village Name"
                                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Priority</label>
                                <select
                                    value={currentPriority}
                                    onChange={e => setCurrentPriority(e.target.value)}
                                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                                >
                                    <option value="P1">P1 - Urgent</option>
                                    <option value="P2">P2 - Standard</option>
                                    <option value="P3">P3 - Low</option>
                                </select>
                            </div>
                        </div>

                        {/* Products Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
                            {PRODUCTS.map(prod => (
                                <div key={prod.key}>
                                    <label className="block text-[10px] text-[var(--text-secondary)] mb-1 truncate" title={prod.label}>{prod.label}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={currentProducts[prod.key] || ''}
                                        onChange={e => setCurrentProducts({ ...currentProducts, [prod.key]: parseFloat(e.target.value) || 0 })}
                                        className={`w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none ${currentProducts[prod.key] ? 'border-green-500/50 bg-green-500/5' : ''}`}
                                        placeholder="0"
                                    />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleAddToQueue}
                            disabled={!currentLocation}
                            className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
                        >
                            Add Location to Queue
                        </button>
                    </div>

                    {/* Queue Review */}
                    {demandQueue.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-[var(--text-secondary)] text-sm uppercase tracking-wider">Queue ({demandQueue.length})</h3>
                            {demandQueue.map((item, idx) => (
                                <div key={item.id} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 flex justify-between items-center animate-fadeIn">
                                    <div className="flex gap-4 items-center">
                                        <div className="size-8 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">{idx + 1}</div>
                                        <div>
                                            <div className="font-bold text-[var(--text-primary)]">{item.location}</div>
                                            <div className="text-xs text-[var(--text-secondary)]">{item.total_mt} MT • {item.priority}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemoveFromQueue(item.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">delete</span>
                                    </button>
                                </div>
                            ))}

                            <div className="pt-4 border-t border-[var(--border-color)]">
                                <button
                                    onClick={handleSubmitAll}
                                    disabled={isSubmitting}
                                    className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black text-lg shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <span className="material-symbols-outlined">check_circle</span>
                                    )}
                                    Finalize Final Order ({demandQueue.reduce((acc, i) => acc + i.total_mt, 0).toFixed(3)} MT)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default AddDemand;
