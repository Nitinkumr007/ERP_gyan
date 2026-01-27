
import React, { useState, useEffect } from 'react';
import { Distributor } from '../types';
import { supabase } from '../supabaseClient';

const PartnerNetwork: React.FC = () => {
  const [partners, setPartners] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('Distributor_Master')
        .select('*')
        .order('DB Name', { ascending: true });

      if (fetchError) throw fetchError;

      if (data) {
        setPartners(data.map((d: any) => ({
          dbId: d['DB ID'],
          dbName: d['DB Name'] || '',
          distributorName: d['NAME OF DISTRIBUTOR'] || '',
          region: d['REGION'] || '',
          district: d['DISTRICT'] || '',
          plant: d['PLANT'] || '',
          status: d['Status'] || 'Active',
          address: d['ADDRESS'],
          email: d['Email']
        })));
      }
    } catch (err: any) {
      console.error('Network Fetch Error:', err);
      setError('Could not establish link to the global partner matrix.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = partners.filter(p =>
    p.dbName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.distributorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="size-14 bg-[var(--bg-panel)] rounded-2xl flex items-center justify-center text-[var(--color-primary)] shadow-sm border border-[var(--border-color)]">
            <span className="material-symbols-outlined text-3xl">handshake</span>
          </div>
          <div>
            <h2 className="text-[var(--text-primary)] text-3xl font-black tracking-tight leading-tight">Partner Directory</h2>
            <p className="text-[var(--text-secondary)] font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Live Feed from Global Master Registry</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-[var(--bg-panel)] px-6 py-3 rounded-2xl flex items-center gap-4 border border-[var(--border-color)] shadow-sm">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Active Nodes</span>
              <span className="text-lg font-black text-[var(--color-primary)]">{partners.length}</span>
            </div>
            <div className="h-8 w-[1px] bg-[var(--border-color)]"></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Registry Sync</span>
              <span className="text-lg font-black text-[var(--color-secondary)]">Stable</span>
            </div>
          </div>
          <button onClick={fetchPartners} className="bg-[var(--bg-panel)] size-12 rounded-2xl hover:bg-[var(--bg-secondary)] transition-colors flex items-center justify-center border border-[var(--border-color)] text-[var(--text-primary)]">
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>sync</span>
          </button>
        </div>
      </header>

      <div className="bg-[var(--bg-panel)] rounded-[2rem] overflow-hidden flex flex-col shadow-sm border border-[var(--border-color)] min-h-[500px]">
        <div className="p-6 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-6 bg-[var(--bg-primary)]">
          <div className="relative max-w-md w-full group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors text-xl">search</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] pl-12 pr-6 py-3.5 rounded-2xl focus:outline-none focus:border-[var(--color-primary)] text-sm placeholder-[var(--text-muted)] text-[var(--text-primary)] transition-all"
              placeholder="Search directory by entity or zone..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mr-2">Authorized Terminal View</span>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar">
          {error ? (
            <div className="p-20 text-center text-red-500 flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-5xl">leak_remove</span>
              <p className="font-bold">{error}</p>
              <button onClick={fetchPartners} className="px-6 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase text-[var(--text-primary)] hover:bg-[var(--border-color)]">Retry Connection</button>
            </div>
          ) : (
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="text-left border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--text-secondary)]">Partner Entity</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--text-secondary)]">Zone / District</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--text-secondary)]">Network Status</th>
                  <th className="px-4 py-3 text-right text-[9px] font-black uppercase tracking-[0.1em] text-[var(--text-secondary)]">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3"><div className="w-40 h-6 bg-[var(--bg-secondary)] rounded-lg"></div></td>
                      <td className="px-4 py-3"><div className="w-32 h-6 bg-[var(--bg-secondary)] rounded-lg"></div></td>
                      <td className="px-4 py-3"><div className="w-20 h-6 bg-[var(--bg-secondary)] rounded-full"></div></td>
                      <td className="px-4 py-3"><div className="ml-auto size-8 bg-[var(--bg-secondary)] rounded-lg"></div></td>
                    </tr>
                  ))
                ) : filtered.map((p) => (
                  <tr key={p.dbId} className="hover:bg-[var(--bg-secondary)] border-b border-[var(--border-color)] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center text-[var(--color-primary)] font-black shadow-sm text-xs">
                          {p.dbName.slice(0, 2).toUpperCase() || 'DB'}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text-primary)]">{p.dbName}</div>
                          <div className="text-[10px] text-[var(--text-secondary)] truncate max-w-[200px]">{p.distributorName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[var(--text-primary)] font-medium">{p.region}</span>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                          <span>{p.district}</span>
                          <span>•</span>
                          <span className="text-blue-500">{p.plant || 'Global'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${p.status === 'Active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                        <span className={`size-1.5 rounded-full ${p.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="size-8 flex items-center justify-center ml-auto bg-[var(--bg-primary)] hover:bg-[var(--color-primary)] hover:text-white border border-[var(--border-color)] rounded transition-all text-[var(--text-secondary)]">
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerNetwork;
