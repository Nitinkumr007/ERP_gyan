
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { utils, writeFile } from 'xlsx';

interface ReportRequest {
    id: string;
    reportId: string;
    title: string;
    table: string | null;
    filePrefix: string;
    startDate: string;
    endDate: string;
    status: 'Pending' | 'Processing' | 'Ready';
    requestedAt: Date;
}

const Reports: React.FC = () => {
    // Selection State
    const [dateRange, setDateRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // Queue State
    const [requests, setRequests] = useState<ReportRequest[]>([]);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [showQueue, setShowQueue] = useState(false);
    const [animatingCard, setAnimatingCard] = useState<string | null>(null);

    const reportsList = [
        // Transactional (Supports Date)
        {
            id: 'demand_log',
            category: 'Operational',
            title: 'Demand Log',
            desc: 'Daily order logging & dispatch tracking.',
            table: 'demand_dispatch_master',
            file: 'Demand_Report',
            supportsDate: true,
            icon: 'receipt_long',
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            id: 'custom_pending',
            category: 'Operational',
            title: 'Pending Orders',
            desc: 'Unpaid or undispatched order queue.',
            table: null,
            file: 'Pending_Orders',
            supportsDate: true,
            icon: 'pending_actions',
            color: 'text-red-500',
            bg: 'bg-red-500/10'
        },
        {
            id: 'custom_plant_summary',
            category: 'Operational',
            title: 'Plant Summary',
            desc: 'Aggregated MT volume by Plant.',
            table: null,
            file: 'Plant_Summary',
            supportsDate: true,
            icon: 'factory',
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10'
        },

        // Master Data (No Date)
        {
            id: 'distributors',
            category: 'Master Data',
            title: 'Distributor DB',
            desc: 'Full distributor territories & details.',
            table: 'Distributor_Master',
            file: 'Distributor_Master_Report',
            supportsDate: false,
            icon: 'store',
            color: 'text-green-500',
            bg: 'bg-green-500/10'
        },
        {
            id: 'custom_high_balance',
            category: 'Master Data',
            title: 'High Balances',
            desc: 'Alerts for > ₹5L outstanding.',
            table: null,
            file: 'High_Balance',
            supportsDate: false,
            icon: 'money_off',
            color: 'text-orange-500',
            bg: 'bg-orange-500/10'
        },
        {
            id: 'products',
            category: 'Master Data',
            title: 'Product Catalog',
            desc: 'Pricing, weights & SKU details.',
            table: 'product_master',
            file: 'Product_List',
            supportsDate: false,
            icon: 'inventory_2',
            color: 'text-amber-500',
            bg: 'bg-amber-500/10'
        },
        {
            id: 'users',
            category: 'Master Data',
            title: 'User Roles',
            desc: 'System access & hierarchy map.',
            table: 'user_access_master',
            file: 'User_Report',
            supportsDate: true, // Technicaly has created_at, but behaves like master
            icon: 'group',
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        }
    ];

    const handleRequestReport = (reportId: string) => {
        const reportDef = reportsList.find(r => r.id === reportId);
        if (!reportDef) return;

        setAnimatingCard(reportId);
        setTimeout(() => setAnimatingCard(null), 600);

        const newRequest: ReportRequest = {
            id: Math.random().toString(36).substr(2, 9),
            reportId: reportDef.id,
            title: reportDef.title,
            table: reportDef.table,
            filePrefix: reportDef.file,
            startDate: dateRange.start,
            endDate: dateRange.end,
            status: 'Processing',
            requestedAt: new Date()
        };

        if (!showQueue) setShowQueue(true);
        setRequests(prev => [newRequest, ...prev]);

        setTimeout(() => {
            setRequests(prev => prev.map(r => r.id === newRequest.id ? { ...r, status: 'Ready' } : r));
        }, 1500);
    };

    const executeDownload = async (req: ReportRequest) => {
        setDownloading(req.id);
        try {
            let data: any[] = [];
            const applyDateFilter = (query: any) => {
                const reportDef = reportsList.find(r => r.id === req.reportId);
                // Standard date filter for compatible reports
                if (reportDef?.supportsDate) {
                    return query.gte('created_at', req.startDate + 'T00:00:00').lte('created_at', req.endDate + 'T23:59:59');
                }
                return query;
            };

            // ... (Same logic for fetch) ...
            if (req.reportId.startsWith('custom_')) {
                if (req.reportId === 'custom_pending') {
                    let query = supabase.from('demand_dispatch_master').select('*')
                        .neq('payment_status', 'Paid')
                        .neq('payment_status', 'Dispatched');
                    const { data: res, error } = await applyDateFilter(query);
                    if (error) throw error;
                    data = res || [];
                }
                else if (req.reportId === 'custom_high_balance') {
                    const { data: res, error } = await supabase.from('Distributor_Master').select('*');
                    if (error) throw error;
                    data = (res || []).filter(d => {
                        const bal = parseFloat((d.closing_balance || d.outstanding_amount || 0).toString().replace(/,/g, ''));
                        return bal > 500000;
                    });
                }
                else if (req.reportId === 'custom_plant_summary') {
                    let query = supabase.from('demand_dispatch_master').select('*');
                    const { data: res, error } = await applyDateFilter(query);
                    if (error) throw error;
                    const plantMap: Record<string, number> = {};
                    res?.forEach(order => {
                        const plant = order.plant_name || 'Unknown';
                        plantMap[plant] = (plantMap[plant] || 0) + (order.total_in_mt || 0);
                    });
                    data = Object.entries(plantMap).map(([Plant, TotalMT]) => ({ Plant, 'Total MT': TotalMT }));
                }
            } else {
                if (!req.table) return;
                let query = supabase.from(req.table).select('*');
                const { data: res, error } = await applyDateFilter(query);
                if (error) throw error;
                data = res || [];
            }

            if (!data || data.length === 0) {
                alert('No data found for the selected criteria.');
                return;
            }

            const ws = utils.json_to_sheet(data);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Report");
            const fileName = `${req.filePrefix}_${req.startDate}_to_${req.endDate}.xlsx`;
            writeFile(wb, fileName);

        } catch (error: any) {
            console.error('Download error:', error);
            alert(`Failed to generate: ${error.message}`);
        } finally {
            setDownloading(null);
        }
    };

    // Grouping
    const operationalReports = reportsList.filter(r => r.category === 'Operational');
    const masterReports = reportsList.filter(r => r.category === 'Master Data');

    return (
        <div className="flex h-full relative overflow-hidden bg-[var(--bg-primary)]">
            {/* Main Content */}
            <div className={`flex-1 transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] overflow-y-auto custom-scrollbar ${showQueue ? 'mr-[400px]' : ''}`}>

                {/* PREMIER STICKY HEADER */}
                <div className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-2xl border-b border-[var(--border-color)] px-6 py-4 shadow-sm transition-all">
                    <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
                        {/* 1. Brand / Title */}
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                                <span className="material-symbols-outlined text-xl">analytics</span>
                            </div>
                            <div>
                                <h1 className="text-[var(--text-primary)] text-lg font-black tracking-tight leading-none">Reports Center</h1>
                                <p className="text-[var(--text-secondary)] font-bold text-[10px] tracking-widest uppercase mt-1">Data Export Portal</p>
                            </div>
                        </div>

                        {/* 2. Global Date Controller (Pill Design) */}
                        <div className="hidden md:flex bg-[var(--bg-panel)] rounded-full border border-[var(--border-color)] shadow-sm p-1 gap-1 items-center">
                            <div className="flex items-center gap-2 px-3 py-1.5 border-r border-[var(--border-color)]">
                                <span className="material-symbols-outlined text-[var(--text-muted)] text-base">calendar_today</span>
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest">Start Date</span>
                                    <input
                                        type="date"
                                        className="bg-transparent text-xs font-bold text-[var(--text-primary)] outline-none w-24 p-0 border-none cursor-pointer"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5">
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest">End Date</span>
                                    <input
                                        type="date"
                                        className="bg-transparent text-xs font-bold text-[var(--text-primary)] outline-none w-24 p-0 border-none cursor-pointer"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Queue Trigger */}
                        <button
                            onClick={() => setShowQueue(!showQueue)}
                            className={`
                                relative h-10 px-4 rounded-lg flex items-center gap-2 transition-all font-bold text-xs shadow-sm border
                                ${showQueue
                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white hover:brightness-110'
                                    : 'bg-[var(--bg-panel)] border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}
                            `}
                        >
                            <span className="material-symbols-outlined text-lg">
                                {showQueue ? 'close_fullscreen' : 'view_sidebar'}
                            </span>
                            <span className="hidden sm:inline">{showQueue ? 'Close' : 'View Queue'}</span>
                            {!showQueue && requests.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 size-5 flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full shadow-md animate-bounce">
                                    {requests.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* CONTENT GRID */}
                <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8 pb-20">

                    {/* SECTION 1: Operational */}
                    <section className="animate-slideIn" style={{ animationDelay: '0ms' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="h-px bg-[var(--border-color)] w-8"></span>
                            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Operational Reports (Date Filtered)</h3>
                            <span className="h-px bg-[var(--border-color)] flex-1"></span>
                        </div>
                        <div className={`grid gap-4 transition-all duration-500 ${showQueue ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                            {operationalReports.map(report => (
                                <ReportCard
                                    key={report.id}
                                    report={report}
                                    onAdd={handleRequestReport}
                                    animating={animatingCard === report.id}
                                    compact={showQueue}
                                />
                            ))}
                        </div>
                    </section>

                    {/* SECTION 2: Master Data */}
                    <section className="animate-slideIn" style={{ animationDelay: '100ms' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="h-px bg-[var(--border-color)] w-8"></span>
                            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Master Data (Full Dump)</h3>
                            <span className="h-px bg-[var(--border-color)] flex-1"></span>
                        </div>
                        <div className={`grid gap-4 transition-all duration-500 ${showQueue ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                            {masterReports.map(report => (
                                <ReportCard
                                    key={report.id}
                                    report={report}
                                    onAdd={handleRequestReport}
                                    animating={animatingCard === report.id}
                                    compact={showQueue}
                                />
                            ))}
                        </div>
                    </section>
                </div>
            </div>

            {/* PREMIER SIDE QUEUE PANEL (Wider 400px) */}
            <div
                className={`fixed top-0 right-0 bottom-0 w-[400px] bg-[var(--bg-panel)] border-l border-[var(--border-color)] shadow-[-20px_0_50px_rgba(0,0,0,0.1)] transform transition-transform duration-500 cubic-bezier(0.25, 0.8, 0.25, 1) z-50 flex flex-col ${showQueue ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Queue Header */}
                <div className="h-[73px] flex items-center justify-between px-6 border-b border-[var(--border-color)] bg-[var(--bg-panel)]/95 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)]">
                            <span className="material-symbols-outlined text-lg">playlist_play</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wide">Download Queue</h3>
                            <p className="text-[10px] text-[var(--text-muted)] font-bold">{requests.length} Requests Pending</p>
                        </div>
                    </div>
                </div>

                {/* Queue List (Dense & Professional) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-[var(--bg-secondary)]/20">
                    {requests.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-translucent)] opacity-40 select-none">
                            <span className="material-symbols-outlined text-7xl mb-4 font-thin">history_edu</span>
                            <p className="font-bold text-sm tracking-widest uppercase">Queue Empty</p>
                        </div>
                    ) : (
                        requests.map((req) => (
                            <div key={req.id} className="bg-[var(--bg-panel)] p-3 rounded-xl border border-[var(--border-color)] hover:border-[var(--color-primary)] transition-all group shadow-sm flex flex-col gap-3 animate-slideIn">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-0.5 size-2 rounded-full ${req.status === 'Ready' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-blue-500 animate-pulse'}`}></div>
                                        <div>
                                            <h4 className="font-bold text-[var(--text-primary)] text-xs leading-tight">{req.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-tight">
                                                    {req.requestedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${req.status === 'Ready' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {req.status}
                                    </span>
                                </div>

                                {/* Date Context & Action */}
                                <div className="flex items-center justify-between gap-3 pl-5">
                                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] font-medium bg-[var(--bg-secondary)] px-2 py-1 rounded-md border border-[var(--border-color)]/50">
                                        <span className="material-symbols-outlined text-[10px]">date_range</span>
                                        <span>{req.startDate}</span>
                                        <span className="text-[var(--text-muted)]">→</span>
                                        <span>{req.endDate}</span>
                                    </div>

                                    <button
                                        onClick={() => req.status === 'Ready' && executeDownload(req)}
                                        disabled={req.status !== 'Ready' || downloading === req.id}
                                        className={`
                                            flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 transition-all
                                            ${req.status === 'Ready'
                                                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 shadow-lg'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed'}
                                        `}
                                    >
                                        {downloading === req.id ? (
                                            <span className="size-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                        ) : (
                                            <span className="material-symbols-outlined text-xs">download</span>
                                        )}
                                        {downloading === req.id ? 'Saving...' : 'Export'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// Sub-component for clean cards
const ReportCard = ({ report, onAdd, animating, compact }: { report: any, onAdd: any, animating: boolean, compact: boolean }) => (
    <div
        onClick={() => onAdd(report.id)}
        className={`
            bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl p-4 cursor-pointer
            hover:border-[var(--color-primary)] hover:shadow-lg transition-all duration-300 group relative overflow-hidden flex flex-col justify-between
            ${compact ? 'h-[110px]' : 'h-[160px]'}
        `}
    >
        {animating && <div className="absolute inset-0 bg-[var(--color-primary)]/5 animate-ping rounded-2xl pointer-events-none"></div>}

        <div className="flex items-start justify-between">
            <div className={`size-10 rounded-xl ${report.bg} ${report.color} flex items-center justify-center transition-all duration-300 ${compact ? 'scale-90' : ''}`}>
                <span className="material-symbols-outlined text-xl">{report.icon}</span>
            </div>
            <button className="size-8 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-primary)] hover:text-white">
                <span className="material-symbols-outlined text-lg">add</span>
            </button>
        </div>

        <div>
            <h4 className={`font-bold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] transition-colors leading-tight ${compact ? 'text-sm' : 'text-base'}`}>{report.title}</h4>
            {!compact && <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{report.desc}</p>}
            {compact && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{report.id.replace('custom_', '')}</p>}
        </div>
    </div>
);

export default Reports;
