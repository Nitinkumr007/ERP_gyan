
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { DemandDispatchMaster } from '../types';

const BalanceCheck: React.FC = () => {
  const [distributors, setDistributors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDB, setSelectedDB] = useState<any | null>(null); // For history modal
  const [history, setHistory] = useState<DemandDispatchMaster[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchDistributors();
  }, []);

  const fetchDistributors = async () => {
    setLoading(true);
    try {
      // Fetching all distributors. 
      // We assume 'closing_balance' is the column for balance. 
      // If it doesn't exist, this might return null or error, so we handle gracefully.
      const { data, error } = await supabase
        .from('Distributor_Master')
        .select('*')
        .order('DB ID');

      if (error) throw error;
      setDistributors(data || []);
    } catch (error) {
      console.error('Error fetching balance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (dbId: number) => {
    setHistoryLoading(true);
    setHistory([]);
    try {
      // Fetching demands/orders for this DB as a log of transactions
      const { data, error } = await supabase
        .from('demand_dispatch_master')
        .select('*')
        .eq('db_id', dbId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data as DemandDispatchMaster[]);
    } catch (err) {
      console.error("Error history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleRowClick = (db: any) => {
    setSelectedDB(db);
    fetchHistory(db['DB ID']);
  };

  const filtered = distributors.filter(d => {
    const term = searchTerm.toLowerCase();
    const name = d['NAME OF DISTRIBUTOR']?.toLowerCase() || '';
    const id = d['DB ID']?.toString() || '';
    return name.includes(term) || id.includes(term);
  });

  // Formatting helper
  const fmtMoney = (amount: any) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '₹ 0.00';
    return num.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      style: 'currency',
      currency: 'INR'
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] shadow-sm">
            <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl">account_balance_wallet</span>
          </div>
          <div>
            <h2 className="text-[var(--text-primary)] text-3xl font-black tracking-tight leading-tight">DBR Balance Check</h2>
            <div className="flex items-center gap-2 text-[var(--text-secondary)] font-bold uppercase tracking-[0.2em] text-[10px]">
              <div className="size-1.5 bg-[var(--color-primary)] rounded-full shadow-sm"></div>
              Financial Overview
            </div>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl flex items-center px-4 py-3 gap-3 focus-within:border-[var(--color-primary)] transition-all">
            <span className="material-symbols-outlined text-[var(--text-muted)]">search</span>
            <input
              className="bg-transparent border-none text-[var(--text-primary)] text-sm focus:ring-0 w-full placeholder-[var(--text-muted)]"
              placeholder="Search DBR by name or ID..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="bg-[var(--bg-secondary)] rounded-full p-0.5">
                <span className="material-symbols-outlined text-[16px] text-[var(--text-muted)]">close</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="bg-[var(--bg-panel)] rounded-[2rem] overflow-hidden shadow-sm border border-[var(--border-color)]">
        <div className="p-8 border-b border-[var(--border-color)] flex flex-col md:flex-row justify-between items-center bg-[var(--bg-primary)] gap-6">
          <div className="flex gap-12 w-full md:w-auto">
            <div>
              <p className="text-[var(--text-secondary)] text-[11px] font-black uppercase tracking-widest mb-1">Total Outstanding (Visible)</p>
              <h4 className="text-2xl font-black text-[var(--text-primary)]">
                {fmtMoney(filtered.reduce((sum, d) => sum + (parseFloat(d.closing_balance) || 0), 0))}
              </h4>
            </div>
            <div>
              <p className="text-[var(--text-secondary)] text-[11px] font-black uppercase tracking-widest mb-1">Active Accounts</p>
              <h4 className="text-2xl font-black text-[var(--text-primary)]">{filtered.length}</h4>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto justify-end">
            <button
              onClick={fetchDistributors}
              className="bg-[var(--bg-secondary)] px-4 py-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-all border border-[var(--border-color)]"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span className="text-xs font-bold uppercase tracking-wider">Refresh</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center h-40 text-[var(--text-muted)]">
              <span className="animate-spin material-symbols-outlined text-3xl mr-2">progress_activity</span> Loading data...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex justify-center items-center h-40 text-[var(--text-muted)]">
              No distributors found matching "{searchTerm}"
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[var(--bg-secondary)] z-10 shadow-sm">
                <tr className="border-b border-[var(--border-color)]">
                  <th className="px-8 py-5 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">DBR Name & Identification</th>
                  <th className="px-8 py-5 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">District / Region</th>
                  <th className="px-8 py-5 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] text-right">Closing Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filtered.map((d) => (
                  <tr
                    key={d['DB ID']}
                    onClick={() => handleRowClick(d)}
                    className="hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-[var(--bg-primary)] flex items-center justify-center border border-[var(--border-color)] group-hover:border-[var(--color-primary)] transition-colors text-[var(--text-secondary)] font-bold text-xs">
                          {d['NAME OF DISTRIBUTOR']?.charAt(0)}
                        </div>
                        <div>
                          <h5 className="text-[var(--text-primary)] font-bold text-sm tracking-tight group-hover:text-[var(--color-primary)] transition-colors">
                            {d['NAME OF DISTRIBUTOR']}
                          </h5>
                          <p className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-widest mt-0.5">
                            ID: {d['DB ID']}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{d['DISTRICT']}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] tracking-wider uppercase">{d['REGION']}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full text-[10px] font-bold tracking-wider ${d['Status'] === 'Active' ? 'text-green-500' : 'text-[var(--text-muted)]'}`}>
                        {d['Status'] || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className={`text-lg font-black tracking-tight ${(parseFloat(d.closing_balance) || 0) > 0 ? 'text-[var(--color-primary)]' : 'text-green-500'}`}>
                        {fmtMoney(d.closing_balance)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* History Modal */}
      {selectedDB && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[var(--bg-panel)] w-full max-w-4xl h-[80vh] rounded-3xl border border-[var(--border-color)] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-secondary)]/50">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{selectedDB['NAME OF DISTRIBUTOR']}</h3>
                <p className="text-[var(--text-secondary)] text-xs uppercase tracking-wider font-bold mt-1">
                  ID: {selectedDB['DB ID']} | Ledger & Transaction History
                </p>
              </div>
              <button
                onClick={() => setSelectedDB(null)}
                className="p-2 hover:bg-[var(--bg-panel)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 custom-scrollbar bg-[var(--bg-primary)]">
              {historyLoading ? (
                <div className="h-full flex items-center justify-center gap-2 text-[var(--text-muted)]">
                  <span className="animate-spin material-symbols-outlined">progress_activity</span>
                  Fetching records...
                </div>
              ) : history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-60">
                  <span className="material-symbols-outlined text-5xl mb-4">receipt_long</span>
                  <p>No transaction history found for this distributor.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map(item => (
                    <div key={item.demand_id} className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-color)] flex justify-between items-center hover:border-l-4 hover:border-l-[var(--color-primary)] transition-all">
                      <div className="flex gap-4 items-center">
                        <div className="size-12 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--color-primary)]">
                          <span className="material-symbols-outlined">
                            {item.payment_status === 'Paid' ? 'verified' : 'pending_actions'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[var(--text-primary)]">
                            Order #{item.order_id} <span className="text-[var(--text-muted)] font-normal text-xs">| Demand ID: {item.demand_id}</span>
                          </div>
                          <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-1">
                            <span>{new Date(item.created_at!).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{item.transport || 'No Transport Info'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-black text-[var(--text-primary)]">
                          {item.total_in_mt ? `${item.total_in_mt} MT` : '-'}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.payment_status === 'Paid' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {item.payment_status || 'Pending'}
                        </span>
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

export default BalanceCheck;
