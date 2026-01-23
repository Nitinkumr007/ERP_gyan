import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { AppState, ProductMaster } from '../types';

interface AddDemandProps {
    onNavigate: (page: AppState) => void;
}

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

    // Dynamic Products & Categories
    const [products, setProducts] = useState<ProductMaster[]>([]);
    const [activeTab, setActiveTab] = useState<string>('');

    // LIST OF VALID COLUMNS IN DB (from DemandDispatchMaster)
    // This acts as a whitelist to prevent "column not found" errors
    const VALID_DB_COLUMNS = new Set([
        'supreme_50kg', 'supreme_25kg',
        'gold_pro_50kg', 'gold_pro_25kg',
        'doodh_plus_50kg', 'doodh_plus_25kg',
        'bhains_special_50kg',
        'diamond_pro_50kg',
        'transition_feed_25kg',
        'calf_starter_5kg',
        'cmm_red_10kg', 'cmm_premium_10kg',
        'milk_maxima_20ltrs', 'milk_maxima_10ltrs',
        'milk_maxima_5x3ltrs', 'milk_maxima_1x16ltrs', 'milk_maxima_5x2ltrs',
        'batisa_gold_20gms', 'batisa_gold_100gms',
        'masti_shield_20x300gms',
        'snf_power_plus_20x500gms',
        'toxin_binder_20x500gms',
        'utriclean_1x10_bottle'
    ]);

    // Mapping for special cases where Product Name slug doesn't match DB Column
    const PRODUCT_KEY_MAPPING: Record<string, string> = {
        'milk_maxima_20l': 'milk_maxima_20ltrs',
        'milk_maxima_10l': 'milk_maxima_10ltrs',
        'milk_maxima_5x3l': 'milk_maxima_5x3ltrs',
        'milk_maxima_1x16l': 'milk_maxima_1x16ltrs',
        'milk_maxima_5x2l': 'milk_maxima_5x2ltrs',
        'batisa_gold_20g': 'batisa_gold_20gms',
        'batisa_gold_100g': 'batisa_gold_100gms',
        'masti_shield': 'masti_shield_20x300gms',
        'snf_power_plus': 'snf_power_plus_20x500gms',
        'toxin_binder': 'toxin_binder_20x500gms',
        'utriclean': 'utriclean_1x10_bottle'
    };

    // Queue
    const [demandQueue, setDemandQueue] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchDistributors();
        fetchProducts();
    }, []);

    const fetchDistributors = async () => {
        const { data } = await supabase.from('Distributor_Master').select('*');
        if (data) setDistributors(data);
    };

    const fetchProducts = async () => {
        const { data, error } = await supabase
            .from('product_master')
            .select('*')
            .eq('status', 'Active')
            .order('product_id', { ascending: true });

        if (data) {
            setProducts(data);
            // Set default tab to the first category if available
            const uniqueCategories = Array.from(new Set(data.map((p: any) => p.category || 'Other')));
            if (uniqueCategories.length > 0) {
                setActiveTab(uniqueCategories[0]);
            } else {
                setActiveTab('Cattle Feed'); // Fallback
            }
        }
    };

    // Helper to generate keys that match the DB columns in demand_dispatch_master
    const generateKey = (name: string): string => {
        // 1. Basic slug generation
        const slug = name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

        // 2. Check explicit mapping
        if (PRODUCT_KEY_MAPPING[slug]) {
            return PRODUCT_KEY_MAPPING[slug];
        }

        // 3. Fallback: Check for common patterns if specific mapping missed
        // Replace ending 'l' with 'ltrs' if it's a known volume pattern, but be careful
        // For now, explicit mapping is safer.
        return slug;
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

        if (dispatchType === 'Self') {
            if (!vehicleNumber.trim()) {
                alert("Vehicle Number is required for Self Vehicle dispatch.");
                return;
            }
            if (vehicleNumber.trim().length < 5) {
                alert("Please enter a valid Vehicle Number (e.g., MH-12-AB-1234).");
                return;
            }
        }

        // Calculate MT
        let mt = 0;
        products.forEach(p => {
            const key = generateKey(p.product_name);
            if (p.weight && currentProducts[key]) {
                mt += (currentProducts[key] * p.weight) / 1000;
            }
        });

        const newItem = {
            location: currentLocation,
            plant: currentPlant,
            priority: currentPriority,
            products: { ...currentProducts }, // Stores keys like 'supreme_50kg': 10
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
            const { data: maxData } = await supabase.from('demand_dispatch_master').select('order_id').order('order_id', { ascending: false }).limit(1);
            const nextOrderId = (maxData && maxData[0]?.order_id ? maxData[0].order_id : 1000) + 1;

            const rowsToInsert = demandQueue.map(item => {
                // Filter out invalid product keys to prevent DB errors
                const validProducts: Record<string, number> = {};
                Object.entries(item.products).forEach(([key, qty]) => {
                    if (VALID_DB_COLUMNS.has(key)) {
                        validProducts[key] = qty as number;
                    } else {
                        console.warn(`Skipping invalid product key: ${key} (not in schema)`);
                    }
                });

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
                    ...validProducts // Only spread valid columns
                };
                return row;
            });

            const { error } = await supabase.from('demand_dispatch_master').insert(rowsToInsert);

            if (error) throw error;

            alert(`Order #${nextOrderId} created successfully!`);
            onNavigate('PENDING_ORDERS');

        } catch (err: any) {
            console.error("Submission error:", err);
            alert("Failed to submit order: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get unique categories for tabs
    const categories = Array.from(new Set(products.map(p => p.category || 'Other'))).sort();

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
                            <div className="text-sm font-bold text-[var(--color-primary)] mt-1">
                                Closing Balance: ₹{(selectedDistributor['closing_balance'] || 0).toLocaleString()}
                            </div>
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
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Vehicle Number <span className="text-red-500">*</span></label>
                                <input
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                                    placeholder="MH-XX-XX-XXXX"
                                    required
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


                        {/* Dynamic Tabbed Interface */}
                        <div className="flex bg-[var(--bg-primary)] p-1 rounded-xl mb-6 overflow-x-auto custom-scrollbar">
                            {categories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setActiveTab(category)}
                                    className={`flex-1 whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === category
                                        ? 'bg-[var(--bg-panel)] text-[var(--color-primary)] shadow-sm'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>

                        {/* Product List Stack */}
                        <div className="space-y-3 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                            {products.filter(p => p.category === activeTab).map(prod => {
                                const key = generateKey(prod.product_name);
                                return (
                                    <div key={prod.product_id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-primary)] transition-colors group">
                                        <label className="font-medium text-[var(--text-primary)] text-sm flex-1">{prod.product_name}</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={currentProducts[key] || ''}
                                                onChange={e => setCurrentProducts({ ...currentProducts, [key]: parseFloat(e.target.value) || 0 })}
                                                className={`w-24 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none text-right font-mono transition-colors ${currentProducts[key] ? 'border-green-500/50 text-green-400 bg-green-500/5' : ''}`}
                                                placeholder="Qty"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {products.length === 0 && (
                                <div className="text-center text-[var(--text-muted)] py-4">Loading products...</div>
                            )}
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
                                <div key={item.id} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 animate-fadeIn relative overflow-hidden group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-3 items-center">
                                            <div className="size-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-blue-500/20">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="font-bold text-[var(--text-primary)] text-lg leading-tight">{item.location}</div>
                                                <div className="text-xs font-bold text-[var(--text-secondary)] mt-0.5 flex gap-2">
                                                    <span className="text-[var(--color-primary)]">{item.total_mt} MT</span>
                                                    <span>•</span>
                                                    <span className={`px-1.5 rounded ${item.priority === 'P1' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'}`}>{item.priority}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveFromQueue(item.id)} className="text-gray-500 hover:text-red-400 p-2 rounded-lg transition-colors bg-white/5 hover:bg-white/10">
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    </div>

                                    {/* Detailed Product List in Queue */}
                                    <div className="flex flex-wrap gap-2 pl-11">
                                        {Object.entries(item.products as Record<string, number>).map(([key, qty]) => {
                                            if (!qty) return null;
                                            // Find product by generating key from fetched products or strictly matching if possible
                                            // Since we generated keys from product_name, we can try to find the product name back
                                            const prod = products.find(p => generateKey(p.product_name) === key);
                                            return (
                                                <div key={key} className="text-[10px] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-2 py-1 rounded-md text-[var(--text-secondary)] flex items-center gap-1">
                                                    <span className="opacity-70">{prod?.product_name || key}:</span>
                                                    <span className="font-bold text-[var(--text-primary)]">{qty}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
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
