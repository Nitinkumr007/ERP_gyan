
import React, { useState } from 'react';
import DatePicker from '../components/DatePicker';
import { supabase } from '../supabaseClient';
import { utils, writeFile } from 'xlsx';
import { UserAccessMaster, UserMenuPermissions } from '../types';

interface ReportsProps {
    currentUser: UserAccessMaster | null;
}

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

// Static Report Definitions
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
        bg: 'bg-blue-500/10',
        permissionKey: 'access_report_demand_log'
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
        bg: 'bg-red-500/10',
        permissionKey: 'access_report_pending_orders'
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
        bg: 'bg-indigo-500/10',
        permissionKey: 'access_report_plant_summary'
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
        bg: 'bg-green-500/10',
        permissionKey: 'access_report_distributor_db'
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
        bg: 'bg-orange-500/10',
        permissionKey: 'access_report_high_balances'
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
        bg: 'bg-amber-500/10',
        permissionKey: 'access_report_product_catalog'
    },
    {
        id: 'users',
        category: 'Master Data',
        title: 'User Roles',
        desc: 'System access & hierarchy map.',
        table: 'user_access_master',
        file: 'User_Report',
        supportsDate: true,
        icon: 'group',
        color: 'text-purple-500',
        bg: 'bg-purple-500/10',
        permissionKey: 'access_report_user_roles'
    }
];

const Reports: React.FC<ReportsProps> = ({ currentUser }) => {
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
    const [openPicker, setOpenPicker] = useState<'start' | 'end' | null>(null);

    // Pagination
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 10;
    const [hasMore, setHasMore] = useState(false);
    const [queueLoading, setQueueLoading] = useState(false);

    // Initial Fetch & Subscription
    React.useEffect(() => {
        if (!currentUser?.emp_id) return;
        fetchQueue(0);

        const channel = supabase
            .channel('public:report_queue')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'report_queue', filter: `emp_id=eq.${currentUser.emp_id}` }, (payload) => {
                // If a change happens, we ideally re-fetch the current page or the first page.
                // Re-fetching first page ensures latest data is seen.
                fetchQueue(0);
                if (page !== 0) setPage(0);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser?.emp_id]);

    const fetchQueue = async (pageIdx: number = 0) => {
        if (!currentUser?.emp_id) return;
        setQueueLoading(true);
        const start = pageIdx * PAGE_SIZE;
        const end = start + PAGE_SIZE - 1;

        const { data, error } = await supabase
            .from('report_queue')
            .select('*')
            .eq('emp_id', currentUser.emp_id)
            .order('created_at', { ascending: false })
            .range(start, end + 1); // Fetch one extra to check limits

        setQueueLoading(false);

        if (data) {
            const hasMoreData = data.length > PAGE_SIZE;
            setHasMore(hasMoreData);

            const pageData = hasMoreData ? data.slice(0, PAGE_SIZE) : data;

            // Map DB fields to UI ReportRequest type
            const mapped: ReportRequest[] = pageData.map((item: any) => {
                const def = reportsList.find(r => r.id === item.report_id);
                return {
                    id: item.id.toString(),
                    reportId: item.report_id,
                    title: item.title,
                    table: def?.table || null,
                    filePrefix: def?.file || 'Report',
                    startDate: item.start_date,
                    endDate: item.end_date,
                    status: item.status as any,
                    requestedAt: new Date(item.created_at.endsWith('Z') ? item.created_at : item.created_at + 'Z')
                };
            });
            setRequests(mapped);
        }
    };

    const loadNextPage = () => {
        setPage(prev => {
            const next = prev + 1;
            fetchQueue(next);
            return next;
        });
    };

    const loadPrevPage = () => {
        setPage(prev => {
            const next = Math.max(0, prev - 1);
            fetchQueue(next);
            return next;
        });
    };

    const handleRefresh = () => {
        fetchQueue(page);
    };

    // Filter reports based on permissions
    const accessibleReports = reportsList.filter(report => {
        if (!currentUser?.permissions) return false;
        const key = report.permissionKey as keyof UserMenuPermissions;
        return currentUser.permissions[key] === true;
    });

    const handleRequestReport = async (reportId: string) => {
        console.log("Requesting report:", reportId);

        if (!currentUser?.emp_id) {
            console.error("No emp_id found for user");
            alert("User identity not found. Please relogin.");
            return;
        }

        const reportDef = reportsList.find(r => r.id === reportId);
        if (!reportDef) {
            console.error("Report definition not found");
            return;
        }

        setAnimatingCard(reportId);
        setTimeout(() => setAnimatingCard(null), 600);

        // OPTIMISTIC UI
        const tempId = 'temp_' + Date.now();
        const optimisticItem: ReportRequest = {
            id: tempId,
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
        // Prepend and slice
        setRequests(prev => [optimisticItem, ...prev].slice(0, PAGE_SIZE));

        try {
            console.log("Inserting into report_queue...");
            const { data, error } = await supabase.from('report_queue').insert([{
                emp_id: currentUser.emp_id,
                user_name: currentUser.user_name || 'Unknown',
                report_id: reportDef.id,
                title: reportDef.title,
                status: 'Processing',
                start_date: dateRange.start,
                end_date: dateRange.end
            }]).select();

            if (error) {
                console.error("Supabase Insert Error:", error);
                throw error;
            }

            console.log("Insert success:", data);

            // Sync with real DB data
            setPage(0);
            fetchQueue(0);

            if (data && data[0]) {
                const rowId = data[0].id;
                setTimeout(async () => {
                    await supabase.from('report_queue').update({ status: 'Ready' }).eq('id', rowId);
                }, 1500);
            }

        } catch (err: any) {
            console.error("Failed to queue:", err);
            setRequests(prev => prev.filter(r => r.id !== tempId));
            alert("Failed to queue report: " + err.message);
        }
    };

    const executeDownload = async (req: ReportRequest) => {
        setDownloading(req.id);
        try {
            let data: any[] = [];
            const applyDateFilter = (query: any) => {
                const reportDef = reportsList.find(r => r.id === req.reportId);
                if (reportDef?.supportsDate) {
                    return query.gte('created_at', req.startDate + 'T00:00:00').lte('created_at', req.endDate + 'T23:59:59');
                }
                return query;
            };

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
                        const orderPlant = order.plant_name || 'Unknown';
                        plantMap[orderPlant] = (plantMap[orderPlant] || 0) + (order.total_in_mt || 0);
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
    const operationalReports = accessibleReports.filter(r => r.category === 'Operational');
    const masterReports = accessibleReports.filter(r => r.category === 'Master Data');

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
                        <div className="hidden md:flex bg-[var(--bg-panel)] rounded-full border border-[var(--border-color)] shadow-sm p-1 gap-1 items-center relative">
                            <div className="flex items-center gap-2 px-3 py-1.5 border-r border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-secondary)] rounded-l-full transition-colors" onClick={() => setOpenPicker('start')}>
                                <span className="material-symbols-outlined text-[var(--text-muted)] text-base">calendar_today</span>
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest">Start Date</span>
                                    <span className="text-xs font-bold text-[var(--text-primary)]">{dateRange.start}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[var(--bg-secondary)] rounded-r-full transition-colors" onClick={() => setOpenPicker('end')}>
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-widest">End Date</span>
                                    <span className="text-xs font-bold text-[var(--text-primary)]">{dateRange.end}</span>
                                </div>
                            </div>

                            {openPicker === 'start' && (
                                <DatePicker
                                    selectedDate={new Date(dateRange.start)}
                                    onChange={(date) => setDateRange(prev => ({ ...prev, start: date.toISOString().split('T')[0] }))}
                                    onClose={() => setOpenPicker(null)}
                                />
                            )}
                            {openPicker === 'end' && (
                                <DatePicker
                                    selectedDate={new Date(dateRange.end)}
                                    onChange={(date) => setDateRange(prev => ({ ...prev, end: date.toISOString().split('T')[0] }))}
                                    onClose={() => setOpenPicker(null)}
                                />
                            )}
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
                        <div className="flex-1">
                            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wide">Download Queue</h3>
                            <p className="text-[10px] text-[var(--text-muted)] font-bold">{requests.length} Requests • Page {page + 1}</p>
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

                {/* Pagination Controls */}
                <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs font-bold bg-[var(--bg-panel)] gap-2">
                    <button
                        onClick={handleRefresh}
                        className="size-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--color-primary)] hover:text-white transition-all shadow-sm"
                        title="Refresh Queue"
                    >
                        <span className={`material-symbols-outlined text-lg ${queueLoading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>

                    <div className="flex-1 flex items-center justify-end gap-2">
                        <span className="text-[var(--text-secondary)] mr-2">Page {page + 1}</span>
                        <button
                            onClick={loadPrevPage}
                            disabled={page === 0 || queueLoading}
                            className="size-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <button
                            onClick={loadNextPage}
                            disabled={!hasMore || queueLoading}
                            className="size-8 flex items-center justify-center rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-component for clean cards
const ReportCard = ({ report, onAdd, animating, compact }: { report: any, onAdd: any, animating: boolean, compact: boolean }) => (
    <div
        className={`
            bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl p-4
            hover:border-[var(--color-primary)] hover:shadow-lg transition-all duration-300 group relative overflow-hidden flex flex-col justify-between
            ${compact ? 'h-[110px]' : 'h-[160px]'}
        `}
    >
        {animating && <div className="absolute inset-0 bg-[var(--color-primary)]/5 animate-ping rounded-2xl pointer-events-none"></div>}

        <div className="flex items-start justify-between">
            <div className={`size-10 rounded-xl ${report.bg} ${report.color} flex items-center justify-center transition-all duration-300 ${compact ? 'scale-90' : ''}`}>
                <span className="material-symbols-outlined text-xl">{report.icon}</span>
            </div>
            <button
                onClick={() => onAdd(report.id)}
                className="size-8 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--color-primary)] hover:text-white cursor-pointer"
            >
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
