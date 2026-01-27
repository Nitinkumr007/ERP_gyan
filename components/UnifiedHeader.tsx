import React, { useState, useEffect, useRef } from 'react';
import { AppState } from '../types';
import { PAGE_TITLES, PAGE_ICONS } from '../constants';
import DatePicker from './DatePicker';

export interface TabItem {
    id: string;
    page: AppState;
    version?: number;
}

interface UnifiedHeaderProps {
    activeTabId: string;
    tabs: TabItem[];
    onTabClick: (id: string) => void;
    onTabClose: (id: string, e: React.MouseEvent) => void;
    onTabRefresh: (id: string, e: React.MouseEvent) => void;
    onNewTab: () => void;
    onMenuClick: () => void;
    onNavigate: (page: AppState) => void;
    isAdmin: boolean;
}

interface SearchResult {
    id: string;
    title: string;
    type: 'PAGE' | 'REPORT';
    target: AppState;
    icon: string;
}

// Manually curated list of search targets
const SEARCH_DATA: SearchResult[] = [
    // Pages
    ...(Object.keys(PAGE_TITLES) as AppState[]).map(page => ({
        id: page,
        title: PAGE_TITLES[page],
        type: 'PAGE' as const,
        target: page,
        icon: PAGE_ICONS[page] || 'grid_view'
    })),
    // Common Reports (Mapped to REPORTS page for now)
    { id: 'rep_demand', title: 'Report: Demand Log', type: 'REPORT', target: 'REPORTS', icon: 'receipt_long' },
    { id: 'rep_pending', title: 'Report: Pending Orders', type: 'REPORT', target: 'REPORTS', icon: 'pending_actions' },
    { id: 'rep_plant', title: 'Report: Plant Summary', type: 'REPORT', target: 'REPORTS', icon: 'factory' },
    { id: 'rep_dist', title: 'Report: Distributor DB', type: 'REPORT', target: 'REPORTS', icon: 'store' },
    { id: 'rep_prod', title: 'Report: Product Catalog', type: 'REPORT', target: 'REPORTS', icon: 'inventory_2' },
];

const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
    activeTabId,
    tabs,
    onTabClick,
    onTabClose,
    onTabRefresh,
    onNewTab,
    onMenuClick,
    onNavigate,
    isAdmin
}) => {
    const [date, setDate] = useState(new Date());
    const [showCalendar, setShowCalendar] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const searchRef = useRef<HTMLDivElement>(null);

    const formatDate = (d: Date) => {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Search Filtering
    useEffect(() => {
        if (!searchQuery.trim()) {
            setResults([]);
            setSelectedIndex(-1);
            return;
        }
        const lower = searchQuery.toLowerCase();
        const filtered = SEARCH_DATA.filter(item =>
            item.title.toLowerCase().includes(lower) ||
            item.type.toLowerCase().includes(lower)
        ).slice(0, 8); // Limit to 8 results
        setResults(filtered);
        setSelectedIndex(-1);
    }, [searchQuery]);

    // Click Outside to Close Search
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleResultClick = (item: SearchResult) => {
        onNavigate(item.target);
        setShowResults(false);
        setSearchQuery('');
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showResults || results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < results.length) {
                handleResultClick(results[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowResults(false);
        }
    };

    return (
        <header className="h-14 flex items-center justify-between px-2 bg-[#080d12] border-b border-white/5 sticky top-0 z-40 gap-4">

            {/* LEFT SECTION: Mobile Menu + TABS */}
            <div className="flex-1 flex items-center min-w-0 gap-2 md:gap-4 overflow-hidden">
                <button
                    onClick={onMenuClick}
                    className="md:hidden shrink-0 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5"
                >
                    <span className="material-symbols-outlined">menu</span>
                </button>

                {/* Branding/Icon */}
                <div className="hidden md:flex shrink-0 items-center justify-center size-8 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-white/5 text-green-400">
                    <span className="material-symbols-outlined text-lg">agriculture</span>
                </div>

                {/* Scrollable Tabs Container */}
                <div className="flex-1 flex items-center overflow-x-auto no-scrollbar gap-1 mask-linear-fade pr-4">
                    {tabs.map(tab => {
                        const isActive = tab.id === activeTabId;
                        return (
                            <div
                                key={tab.id}
                                onClick={() => onTabClick(tab.id)}
                                className={`
                            group relative flex items-center gap-2 px-3 py-1.5 min-w-[140px] max-w-[200px] rounded-md cursor-pointer transition-all select-none
                            ${isActive
                                        ? 'bg-[var(--bg-primary)] text-white shadow-lg shadow-black/20 border border-white/10'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                    }
                        `}
                            >
                                <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-blue-400' : 'opacity-50'}`}>
                                    {PAGE_ICONS[tab.page] || 'grid_view'}
                                </span>
                                <span className="text-xs font-bold truncate flex-1 leading-none">
                                    {PAGE_TITLES[tab.page] || tab.page}
                                </span>

                                <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onTabRefresh(tab.id, e); }}
                                        className="size-4 rounded-full flex items-center justify-center hover:bg-white/20 text-gray-400 hover:text-blue-400"
                                        title="Refresh Page"
                                    >
                                        <span className="material-symbols-outlined text-[12px]">refresh</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onTabClose(tab.id, e); }}
                                        className="size-4 rounded-full flex items-center justify-center hover:bg-white/20 text-gray-400 hover:text-red-400"
                                        title="Close Tab"
                                    >
                                        <span className="material-symbols-outlined text-[12px]">close</span>
                                    </button>
                                </div>
                            </div>
                        )
                    })}

                    {/* New Tab Button */}
                    <button
                        onClick={onNewTab}
                        className="p-1.5 shrink-0 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        title="New Tab"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                    </button>
                </div>
            </div>

            {/* RIGHT SECTION: Search & Calendar & Notifications */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">

                {/* Search (OMNIBOX) */}
                <div ref={searchRef} className="hidden md:block relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
                        <span className="material-symbols-outlined text-[16px] text-gray-500 group-focus-within:text-blue-400">search</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
                        onFocus={() => setShowResults(true)}
                        onKeyDown={handleKeyDown}
                        className="w-48 lg:w-64 bg-white/5 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-xs text-start text-white placeholder-gray-500 focus:w-72 focus:bg-white/10 focus:border-blue-500/50 transition-all outline-none"
                    />

                    {/* Dropdown Results */}
                    {showResults && searchQuery && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-[#1a1f26] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-slideIn z-50">
                            {results.length > 0 ? (
                                <ul className="py-1">
                                    {results.map((item, index) => (
                                        <li
                                            key={item.id}
                                            onClick={() => handleResultClick(item)}
                                            className={`px-4 py-2 cursor-pointer flex items-center gap-3 group transition-colors ${index === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
                                                }`}
                                        >
                                            <div className={`size-8 rounded-lg flex items-center justify-center ${item.type === 'REPORT' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium transition-colors truncate ${index === selectedIndex ? 'text-blue-400' : 'text-white group-hover:text-blue-400'}`}>
                                                    {item.title}
                                                </p>
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">{item.type}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="px-4 py-3 text-center text-gray-500 text-xs">
                                    No results found.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Calendar */}
                <div className="relative">
                    <button
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:border-white/20 transition-all whitespace-nowrap"
                    >
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        <span className="hidden lg:inline">{formatDate(date)}</span>
                    </button>

                    {showCalendar && (
                        <DatePicker
                            selectedDate={date}
                            onChange={setDate}
                            onClose={() => setShowCalendar(false)}
                        />
                    )}
                </div>

                {/* Notifications */}
                <div className="flex items-center border-l border-white/5 pl-2 ml-1">
                    <button className="relative p-2 text-gray-500 hover:text-white transition-colors">
                        <span className="absolute top-1.5 right-1.5 size-1.5 bg-red-500 rounded-full animate-pulse"></span>
                        <span className="material-symbols-outlined text-[20px]">notifications</span>
                    </button>
                </div>

            </div>
        </header>
    );
};

export default UnifiedHeader;
