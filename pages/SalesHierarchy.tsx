
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserAccessMaster, TerritoryHistory } from '../types';

interface SalesHierarchyProps { }

const SalesHierarchy: React.FC<SalesHierarchyProps> = () => {
    const [activeTab, setActiveTab] = useState<'VISUAL' | 'MAPPING' | 'TERRITORY'>('VISUAL');
    const [users, setUsers] = useState<UserAccessMaster[]>([]);
    const [distributors, setDistributors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Mappings
    const [managerMap, setManagerMap] = useState<Record<string, string | null>>({});
    const [savedMap, setSavedMap] = useState<Record<string, string | null>>({});
    const [isSaving, setIsSaving] = useState(false);

    // History Panel State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedDistributor, setSelectedDistributor] = useState<any>(null);
    const [historyLogs, setHistoryLogs] = useState<TerritoryHistory[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: userData } = await supabase
                .from('user_access_master')
                .select('*')
                .order('user_name');

            const { data: dbData } = await supabase.from('Distributor_Master').select('*');

            if (userData) {
                setUsers(userData as UserAccessMaster[]);

                const initialMap: Record<string, string | null> = {};
                (userData as UserAccessMaster[]).forEach(u => {
                    if (u.reporting_manager_id) {
                        initialMap[u.user_id.toString()] = u.reporting_manager_id;
                    }
                });
                setManagerMap(initialMap);
                setSavedMap(initialMap);
            }
            if (dbData) setDistributors(dbData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (dbId: number) => {
        setHistoryLoading(true);
        try {
            const { data, error } = await supabase
                .from('territory_history')
                .select('*')
                .eq('db_id', dbId)
                .order('start_date', { ascending: false });

            if (error) {
                alert("Error fetching history: " + error.message);
                throw error;
            }
            setHistoryLogs(data || []);
        } catch (err) {
            console.error("Error fetching history:", err);
            setHistoryLogs([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleViewHistory = (dist: any) => {
        setSelectedDistributor(dist);
        setIsHistoryOpen(true);
        fetchHistory(dist['DB ID']);
    };

    const closeHistory = () => {
        setIsHistoryOpen(false);
        setSelectedDistributor(null);
        setHistoryLogs([]);
    };

    // --- Logic Updates ---

    const updateUserManager = (userId: number, managerId: string | null) => {
        setManagerMap(prev => ({ ...prev, [userId.toString()]: managerId }));
    };

    const handleSaveMappings = async () => {
        if (!window.confirm("This will update the reporting structure for all changed users. Continue?")) return;

        setIsSaving(true);
        try {
            const updates = Object.entries(managerMap).map(([userId, managerId]) => {
                const current = users.find(u => u.user_id.toString() === userId);
                if (current && current.reporting_manager_id !== managerId) {
                    return supabase
                        .from('user_access_master')
                        .update({ reporting_manager_id: managerId })
                        .eq('user_id', parseInt(userId));
                }
                return null;
            }).filter(Boolean);

            if (updates.length > 0) {
                await Promise.all(updates);
                alert(`Successfully updated ${updates.length} reporting lines.`);
            } else {
                alert("No changes detected to save.");
            }

            await fetchData();
            setActiveTab('VISUAL');

        } catch (err) {
            console.error("Error saving mappings:", err);
            alert("Failed to save mappings. Check console for details.");
        } finally {
            setIsSaving(false);
        }
    };

    const updateDBTerritory = async (dbId: number, oldAsmId: number | null, newAsmName: string) => {
        const newAsm = users.find(u => u.user_name === newAsmName);
        if (!newAsm) {
            if (newAsmName !== "") alert("Error: User not found.");
            return;
        }

        const confirmChange = window.confirm(`Change ASM to ${newAsmName}? This will be logged in history.`);
        if (!confirmChange) return;

        try {
            // 1. Close old history record (if exact tracking needed, else we just rely on start_date ordering)
            // Ideally we'd update the 'end_date' of the previous record here for this db_id

            // 2. Insert New History Record
            const { error: historyError } = await supabase.from('territory_history').insert([{
                db_id: dbId,
                asm_id: newAsm.user_id,
                asm_name: newAsm.user_name,
                assigned_by: 'Admin', // In real app, get current user
                reason: 'Manual Reassignment'
            }]);

            if (historyError) {
                console.error("History Log Error:", historyError);
                // We typically continue or warn. Let's warn but continue.
            }

            // 3. Update Master Table
            const { error: dbError } = await supabase
                .from('Distributor_Master')
                .update({
                    ASM: newAsm.user_name,
                    "ASM ID": newAsm.user_id
                })
                .eq('DB ID', dbId);

            if (dbError) throw dbError;

            alert("Territory Updated & Logged!");
            fetchData(); // Refresh UI

        } catch (err: any) {
            alert("Error updating territory: " + err.message);
        }
    };


    // --- Renderers ---

    const renderTreeNode = (userId: string, visited: Set<string> = new Set()) => {
        if (visited.has(userId)) return (
            <div key={userId + '-cycle'} className="mt-2 text-[10px] text-red-500 font-bold border border-red-200 bg-red-50 px-2 py-1 rounded">
                Cycle Detected
            </div>
        );

        const newVisited = new Set(visited).add(userId);
        const user = users.find(u => u.user_id.toString() === userId);
        if (!user) return null;

        const reports = users.filter(u => (savedMap[u.user_id.toString()] === userId));

        return (
            <div key={userId} className="flex flex-col items-center animate-fadeIn">
                <div className={`
                    border rounded-xl p-3 shadow-sm min-w-[160px] text-center relative group transition-all z-10
                    ${user.role === 'Admin' ? 'bg-slate-800 text-white border-slate-700' :
                        user.role === 'GM' ? 'bg-purple-100 border-purple-200 text-purple-900' :
                            user.role === 'RSM' ? 'bg-blue-50 border-blue-200 text-blue-900' :
                                user.role === 'ASM' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                                    'bg-white border-[var(--border-color)] text-[var(--text-primary)]'}
                `}>
                    <div className="font-bold text-sm truncate max-w-[180px] mx-auto">{user.user_name}</div>
                    <div className={`text-[10px] uppercase font-bold tracking-wider mt-1 ${user.role === 'Admin' ? 'text-slate-400' : 'opacity-70'}`}>{user.role}</div>
                    {reports.length > 0 && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-6 bg-[var(--border-color)]"></div>
                    )}
                </div>

                {reports.length > 0 && (
                    <div className="flex pt-6 gap-6 relative">
                        {reports.length > 1 && (
                            <div className="absolute top-0 left-[calc(50%_-_(100%_-_160px)/2)] right-[calc(50%_-_(100%_-_160px)/2)] h-px bg-[var(--border-color)]"></div>
                        )}
                        <div className="flex gap-4">
                            {reports.map(report => (
                                <div key={report.user_id} className="relative">
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-px h-6 bg-[var(--border-color)]"></div>
                                    {renderTreeNode(report.user_id.toString(), newVisited)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderVisualTab = () => {
        const allUserIds = new Set(users.map(u => u.user_id.toString()));
        const roots = users.filter(u => {
            const managerId = savedMap[u.user_id.toString()];
            return !managerId || !allUserIds.has(managerId) || managerId === u.user_id.toString();
        });

        return (
            <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] overflow-hidden min-h-[600px] flex flex-col">
                <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/30 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)]">Organization Chart</h3>
                        <p className="text-xs text-[var(--text-secondary)]">Visual representation of reporting lines</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-secondary)] rounded-lg text-[10px] text-[var(--text-secondary)] border border-[var(--border-color)]">
                            <div className="size-2 rounded-full bg-purple-400"></div> GM
                            <div className="size-2 rounded-full bg-blue-400 ml-2"></div> RSM
                            <div className="size-2 rounded-full bg-emerald-400 ml-2"></div> ASM
                        </div>
                        <button onClick={fetchData} className="p-2 hover:bg-[var(--bg-panel)] rounded-lg transition-colors" title="Refresh Data">
                            <span className="material-symbols-outlined text-[var(--text-secondary)]">refresh</span>
                        </button>
                    </div>
                </div>
                <div className="flex-1 bg-[var(--bg-secondary)]/10 overflow-auto custom-scrollbar p-12">
                    {roots.length === 0 && users.length > 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-70">
                            <span className="material-symbols-outlined text-4xl mb-2">sync_problem</span>
                            <p>Unable to determine hierarchy roots. Possible circular dependency.</p>
                        </div>
                    ) : (
                        <div className="flex gap-16 justify-center min-w-max mx-auto">
                            {roots.map(root => renderTreeNode(root.user_id.toString()))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderMappingTab = () => (
        <div className="bg-[var(--bg-panel)] p-6 rounded-2xl border border-[var(--border-color)]">
            <div className="flex justify-between items-end mb-6 sticky top-0 bg-[var(--bg-panel)] z-20 pb-4 border-b border-[var(--border-color)]">
                <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">Edit Reporting Lines</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Configure who reports to whom.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchData} className="p-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-secondary)] transition-all">
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                    </button>
                    <button onClick={handleSaveMappings} disabled={isSaving} className="px-6 py-2.5 bg-[var(--color-primary)] hover:opacity-90 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
                        {isSaving ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span className="material-symbols-outlined text-[20px]">save</span>}
                        Save Changes
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map(user => (
                    <div key={user.user_id} className={`flex flex-col gap-2 p-4 rounded-xl border transition-all ${managerMap[user.user_id.toString()] && managerMap[user.user_id.toString()] !== user.reporting_manager_id ? 'bg-amber-500/5 border-amber-500/20' : 'bg-[var(--bg-primary)] border-[var(--border-color)]'}`}>
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] font-bold text-xs">
                                {user.user_name?.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                                <div className="font-bold text-[var(--text-primary)] truncate" title={user.user_name}>{user.user_name}</div>
                                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{user.role}</div>
                            </div>
                        </div>
                        <select
                            className="w-full mt-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]"
                            value={managerMap[user.user_id.toString()] || ''}
                            onChange={(e) => updateUserManager(user.user_id, e.target.value || null)}
                        >
                            <option value="">No Manager (Root)</option>
                            {users.filter(m => m.user_id !== user.user_id).map(manager => (
                                <option key={manager.user_id} value={manager.user_id}>
                                    Reports to: {manager.user_name}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
        </div>
    );

    const [territoryFilters, setTerritoryFilters] = useState({
        distributor: '',
        district: '',
        asm: '',
        dbId: '' // Added dbId filter state
    });

    const filteredDistributors = distributors.filter(db => {
        return (
            (db['NAME OF DISTRIBUTOR'] || '').toLowerCase().includes(territoryFilters.distributor.toLowerCase()) &&
            (db['DISTRICT'] || '').toLowerCase().includes(territoryFilters.district.toLowerCase()) &&
            (db['ASM'] || '').toLowerCase().includes(territoryFilters.asm.toLowerCase()) &&
            (db['DB ID']?.toString().includes(territoryFilters.dbId)) // Added ID filter logic
        );
    });

    const renderTerritoryTab = () => (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-[var(--bg-panel)] p-6 rounded-2xl border border-[var(--border-color)]">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Territory Mapping</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-6">Assign Distributors (DBR) to Area Sales Managers (ASM).</p>

                <div className="overflow-x-auto min-h-[500px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[var(--bg-panel)] z-10 shadow-sm">
                            <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                                <th className="p-4 w-24">
                                    <div className="mb-2">Code</div>
                                    <input
                                        type="text"
                                        placeholder="Filter ID"
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-normal"
                                        value={territoryFilters.dbId}
                                        onChange={(e) => setTerritoryFilters(prev => ({ ...prev, dbId: e.target.value }))}
                                    />
                                </th>
                                <th className="p-4">
                                    <div className="mb-2">Distributor & Party</div>
                                    <input
                                        type="text"
                                        placeholder="Filter Name..."
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-normal"
                                        value={territoryFilters.distributor}
                                        onChange={(e) => setTerritoryFilters(prev => ({ ...prev, distributor: e.target.value }))}
                                    />
                                </th>
                                <th className="p-4">
                                    <div className="mb-2">District</div>
                                    <input
                                        type="text"
                                        placeholder="Filter District..."
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-normal"
                                        value={territoryFilters.district}
                                        onChange={(e) => setTerritoryFilters(prev => ({ ...prev, district: e.target.value }))}
                                    />
                                </th>
                                <th className="p-4">
                                    <div className="mb-2">Current ASM</div>
                                    <input
                                        type="text"
                                        placeholder="Filter ASM..."
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none font-normal"
                                        value={territoryFilters.asm}
                                        onChange={(e) => setTerritoryFilters(prev => ({ ...prev, asm: e.target.value }))}
                                    />
                                </th>
                                <th className="p-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {filteredDistributors.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-[var(--text-secondary)]">No distributors match your filters.</td>
                                </tr>
                            ) : (
                                filteredDistributors.map(db => (
                                    <tr key={db['DB ID']} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                        <td className="p-4 font-mono text-xs text-[var(--text-secondary)]">{db['DB ID']}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-[var(--text-primary)]">{db['NAME OF DISTRIBUTOR']}</div>
                                            <div className="text-xs text-[var(--text-secondary)]">{db['DB Name']}</div>
                                        </td>
                                        <td className="p-4 text-sm text-[var(--text-secondary)]">{db['DISTRICT']}</td>
                                        <td className="p-4">
                                            <select
                                                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                                                value={db['ASM'] || ''} // Changed defaultValue to value for controlled component behavior if needed, but keeping simple
                                                onChange={(e) => updateDBTerritory(db['DB ID'], db['ASM ID'], e.target.value)}
                                            >
                                                <option value="">Unassigned</option>
                                                {users.map(u => (
                                                    <option key={u.user_id} value={u.user_name}>{u.user_name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleViewHistory(db)}
                                                className="text-[var(--color-primary)] font-bold text-xs hover:underline flex items-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">history</span>
                                                View History
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fadeIn pb-20 relative">
            <div className="flex items-center gap-4">
                <div className="size-14 bg-[var(--bg-panel)] rounded-2xl flex items-center justify-center text-[var(--color-primary)] shadow-sm border border-[var(--border-color)]">
                    <span className="material-symbols-outlined text-3xl">hub</span>
                </div>
                <div>
                    <h1 className="text-[var(--text-primary)] text-3xl font-black">Sales Hierarchy</h1>
                    <p className="text-[var(--text-secondary)] font-bold uppercase tracking-widest text-xs mt-1">Manage Reporting Lines & Territories</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-[var(--border-color)] overflow-x-auto">
                <button
                    onClick={() => setActiveTab('VISUAL')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'VISUAL' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    Visual Chart
                </button>
                <button
                    onClick={() => setActiveTab('MAPPING')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'MAPPING' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    User Mapping
                </button>
                <button
                    onClick={() => setActiveTab('TERRITORY')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'TERRITORY' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                    Territory (DBR-ASM)
                </button>
            </div>

            {loading && !users.length ? (
                <div className="py-20 text-center text-[var(--text-muted)]">Loading hierarchy data...</div>
            ) : (
                <>
                    {activeTab === 'VISUAL' && renderVisualTab()}
                    {activeTab === 'MAPPING' && renderMappingTab()}
                    {activeTab === 'TERRITORY' && renderTerritoryTab()}
                </>
            )}

            {/* Right Panel / History Slide-over */}
            {isHistoryOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={closeHistory}></div>

                    {/* Panel */}
                    <div className="relative w-full max-w-md bg-[var(--bg-panel)] h-full shadow-2xl border-l border-[var(--border-color)] flex flex-col animate-slideRight">
                        <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text-primary)]">Territory History</h3>
                                <div className="text-sm font-medium text-[var(--text-secondary)] mt-1">{selectedDistributor?.['NAME OF DISTRIBUTOR']}</div>
                                <div className="text-xs text-[var(--text-muted)] mt-0.5">{selectedDistributor?.['DISTRICT']}</div>
                            </div>
                            <button onClick={closeHistory} className="p-2 hover:bg-[var(--bg-secondary)] rounded-full text-[var(--text-muted)] transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {historyLoading ? (
                                <div className="flex justify-center py-10"><span className="material-symbols-outlined animate-spin text-[var(--text-muted)]">sync</span></div>
                            ) : historyLogs.length === 0 ? (
                                <div className="text-center py-10 text-[var(--text-muted)]">No history records found.</div>
                            ) : (
                                <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border-color)]">
                                    {historyLogs.map((log, index) => (
                                        <div key={log.id} className="relative pl-10">
                                            {/* Timeline Dot */}
                                            <div className={`absolute left-0 top-1 size-10 rounded-full border-4 border-[var(--bg-panel)] flex items-center justify-center font-bold text-xs shadow-sm z-10 ${index === 0 ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}>
                                                {index === 0 ? <span className="material-symbols-outlined text-[16px]">person</span> : <span className="material-symbols-outlined text-[16px]">history</span>}
                                            </div>

                                            <div className="bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)] shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <div className="font-bold text-[var(--text-primary)]">{log.asm_name}</div>
                                                        <div className="text-xs text-[var(--text-secondary)]">Assigned by {log.assigned_by || 'Unknown'}</div>
                                                    </div>
                                                    <div className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-1 rounded">
                                                        {new Date(log.start_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                {log.reason && (
                                                    <div className="text-xs text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border-color)] italic">
                                                        "{log.reason}"
                                                    </div>
                                                )}
                                                {log.end_date && (
                                                    <div className="text-xs text-red-500 mt-2 font-medium flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">event_busy</span>
                                                        Ended: {new Date(log.end_date).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesHierarchy;
