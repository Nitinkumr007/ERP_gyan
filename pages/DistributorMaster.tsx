import React, { useState, useEffect } from 'react';
import type { Distributor } from '../types';
import { supabase } from '../supabaseClient';

// Extended interface for the full schema
interface DistributorFull extends Distributor {
  rsm_id?: number;
  asm?: string;
  asm_id?: number;
  executive?: string;
  tehsil?: string;
  address?: string;
  pin_code?: number;
  lat?: string;
  long?: string;
  mobile1?: number;
  mobile2?: string;
  email?: string;
  adhar?: string;
  pan?: string;
  dob?: string;
  gst?: string;
  doj?: string;
  exclusive?: string;
  open_remark?: string;
  closing_balance?: number;
}

interface SalesUser {
  user_id: number;
  user_name: string;
  role: string;
}

const DistributorMasterPage: React.FC = () => {
  const [distributors, setDistributors] = useState<DistributorFull[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Sales Team Data
  const [rsmList, setRsmList] = useState<SalesUser[]>([]);
  const [asmList, setAsmList] = useState<SalesUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    dbId: '',
    distributorName: '',
    location: '',
    sales: '',
    contact: '',
    status: ''
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDistributor, setEditingDistributor] = useState<Partial<DistributorFull>>({});
  const [isNewDistributor, setIsNewDistributor] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchDistributors();
    fetchSalesTeam();
  }, []);

  const fetchSalesTeam = async () => {
    setTeamLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_access_master')
        .select('user_id, user_name, role')
        .in('role', ['RSM', 'ASM']);

      if (error) throw error;
      if (data) {
        setRsmList(data.filter((u: any) => u.role === 'RSM'));
        setAsmList(data.filter((u: any) => u.role === 'ASM'));
      }
    } catch (err) {
      console.error('Error fetching sales team:', err);
    } finally {
      setTeamLoading(false);
    }
  };

  const fetchDistributors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Distributor_Master')
        .select('*')
        .order('DB ID', { ascending: true });

      if (error) throw error;
      if (data) {
        setDistributors(data.map((d: any) => ({
          dbId: d['DB ID'],
          status: d['Status'] || 'Active', // Default to Active if null
          rsm: d['RSM'] || '',
          rsm_id: d['RSM ID'],
          asm: d['ASM'] || '',
          asm_id: d['ASM ID'],
          executive: d['EXECUTIVE'] || '',
          region: d['REGION'] || '',
          district: d['DISTRICT'] || '',
          plant: d['PLANT'] || '',
          tehsil: d['TEHSIL'] || '',
          dbName: d['DB Name'] || '',
          distributorName: d['NAME OF DISTRIBUTOR'] || '', // CRITICAL: Prevent null crash
          address: d['ADDRESS'] || '',
          pin_code: d['PIN CODE'],
          lat: d['Lat'],
          long: d['Long'],
          mobile1: d['DB CONTACT NO. 1'],
          mobile2: d['DB CONTACT NO. 2'],
          email: d['Email'] || '',
          adhar: d['ADHAR'],
          pan: d['PAN NO.'] || '',
          dob: d['DOB'],
          gst: d['GST'] || '',
          doj: d['DOJ'],
          exclusive: d['Exclusive / \nNon-\nExclusive'],
          open_remark: d['Open Remark'],
          closing_balance: d['closing_balance']
        })));
      }
    } catch (err: any) {
      console.error('Error fetching distributors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingDistributor({
      dbId: 0,
      status: 'Active',
      distributorName: '',
      dbName: '',
      region: '',
      district: '',
      plant: '',
      mobile1: undefined,
      closing_balance: 0
    });
    setIsNewDistributor(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dist: DistributorFull) => {
    setEditingDistributor({ ...dist });
    setIsNewDistributor(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const payload = {
        'DB ID': editingDistributor.dbId,
        'Status': editingDistributor.status,
        'RSM': editingDistributor.rsm,
        'RSM ID': editingDistributor.rsm_id, // Save ID
        'ASM': editingDistributor.asm,
        'ASM ID': editingDistributor.asm_id, // Save ID
        'REGION': editingDistributor.region,
        'DISTRICT': editingDistributor.district,
        'PLANT': editingDistributor.plant,
        'TEHSIL': editingDistributor.tehsil,
        'DB Name': editingDistributor.dbName,
        'NAME OF DISTRIBUTOR': editingDistributor.distributorName,
        'ADDRESS': editingDistributor.address,
        'PIN CODE': editingDistributor.pin_code,
        'DB CONTACT NO. 1': editingDistributor.mobile1,
        'Email': editingDistributor.email,
        'PAN NO.': editingDistributor.pan,
        'GST': editingDistributor.gst,
        'closing_balance': editingDistributor.closing_balance // Added field
      };

      if (isNewDistributor) {
        const { error } = await supabase.from('Distributor_Master').insert([payload]);
        if (error) throw error;
      } else {
        // --- Special Logic: If Status changes to Inactive (Closing) ---
        if (editingDistributor.status === 'Inactive' && distributors.find(d => d.dbId === editingDistributor.dbId)?.status === 'Active') {
          payload['closing_date'] = new Date().toISOString(); // Auto-set closing date
          payload['Close Remark'] = editingDistributor.open_remark || 'Closed via Distributor Master'; // Capture remark if available

          // Log to History
          await supabase.from('territory_history').insert([{
            db_id: editingDistributor.dbId,
            asm_id: editingDistributor.asm_id || 0, // Fallback if missing
            asm_name: editingDistributor.asm || 'Unknown',
            assigned_by: 'Admin',
            start_date: new Date().toISOString(), // This is effectively the "closing event" log or end date update
            reason: 'Distributor Closed/Inactive'
          }]);
        }

        const { error } = await supabase
          .from('Distributor_Master')
          .update(payload)
          .eq('DB ID', editingDistributor.dbId);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchDistributors();
    } catch (err: any) {
      alert('Error saving distributor: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this distributor?')) return;
    try {
      const { error } = await supabase.from('Distributor_Master').delete().eq('DB ID', id);
      if (error) throw error;
      fetchDistributors();
    } catch (err: any) {
      alert('Error deleting distributor: ' + err.message);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredDistributors = distributors.filter(d => {
    // 1. Global Search (OR)
    const matchesSearch =
      (d.distributorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.dbName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.region || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Column Filters (AND)
    if (filters.dbId && !d.dbId?.toString().includes(filters.dbId)) return false;
    if (filters.distributorName && !(d.distributorName || '').toLowerCase().includes(filters.distributorName.toLowerCase())) return false;

    // Composite filter for Location
    if (filters.location) {
      const loc = filters.location.toLowerCase();
      const matchesLoc =
        (d.region?.toLowerCase().includes(loc)) ||
        (d.district?.toLowerCase().includes(loc)) ||
        (d.plant?.toLowerCase().includes(loc));
      if (!matchesLoc) return false;
    }

    // Composite filter for Sales
    if (filters.sales) {
      const sales = filters.sales.toLowerCase();
      const matchesSales =
        (d.rsm?.toLowerCase().includes(sales)) ||
        (d.asm?.toLowerCase().includes(sales));
      if (!matchesSales) return false;
    }

    // Composite filter for Contact
    if (filters.contact) {
      const contact = filters.contact.toLowerCase();
      const matchesContact =
        (d.mobile1?.toString().includes(contact)) ||
        (d.gst?.toLowerCase().includes(contact));
      if (!matchesContact) return false;
    }

    if (filters.status && !d.status?.toLowerCase().includes(filters.status.toLowerCase())) return false;

    return true;
  });

  return (
    <div className="flex flex-col h-full space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-6 bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] shadow-sm backdrop-blur-md transition-colors duration-300 gap-4">
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-primary)]/20 text-[var(--color-primary)] shadow-sm">
            <span className="material-symbols-outlined">storefront</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-wide">Distributor Master</h1>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Manage network partners and locations</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative group w-full md:w-auto">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">search</span>
            <input
              type="text"
              placeholder="Global Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] w-full md:w-64 transition-all placeholder-[var(--text-muted)]"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchDistributors}
              className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] hover:opacity-90 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-blue-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">add_business</span>
              New Distributor
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-[var(--bg-panel)] rounded-xl border border-[var(--border-color)] backdrop-blur-md overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10 bg-[var(--bg-panel)] border-b border-[var(--border-color)] backdrop-blur-xl">
              <tr className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                <th className="px-3 py-2 w-16">ID</th>
                <th className="px-3 py-2">Distributor</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Sales Team</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right w-20">Actions</th>
              </tr>
              {/* Filter Row */}
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                <th className="px-2 py-1">
                  <input
                    placeholder="ID"
                    value={filters.dbId}
                    onChange={e => handleFilterChange('dbId', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none placeholder-[var(--text-muted)]"
                  />
                </th>
                <th className="px-2 py-1">
                  <input
                    placeholder="Name / Alias..."
                    value={filters.distributorName}
                    onChange={e => handleFilterChange('distributorName', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none placeholder-[var(--text-muted)]"
                  />
                </th>
                <th className="px-2 py-1">
                  <input
                    placeholder="Region..."
                    value={filters.location}
                    onChange={e => handleFilterChange('location', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none placeholder-[var(--text-muted)]"
                  />
                </th>
                <th className="px-2 py-1">
                  <input
                    placeholder="Sales..."
                    value={filters.sales}
                    onChange={e => handleFilterChange('sales', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none placeholder-[var(--text-muted)]"
                  />
                </th>
                <th className="px-2 py-1">
                  <input
                    placeholder="Mobile..."
                    value={filters.contact}
                    onChange={e => handleFilterChange('contact', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none placeholder-[var(--text-muted)]"
                  />
                </th>
                <th className="px-2 py-1"></th>
                <th className="px-2 py-1 text-center">
                  <input
                    placeholder="St"
                    value={filters.status}
                    onChange={e => handleFilterChange('status', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none text-center placeholder-[var(--text-muted)]"
                  />
                </th>
                <th className="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-xs">
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">Loading distributor network...</td></tr>
              ) : filteredDistributors.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-[var(--text-muted)]">No distributors found matching criteria.</td></tr>
              ) : (
                filteredDistributors.map(dist => (
                  <tr key={dist.dbId} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                    <td className="px-3 py-2 font-mono text-[var(--text-muted)] font-bold">
                      {dist.dbId}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-bold text-[var(--text-primary)] truncate max-w-[200px]" title={dist.distributorName}>{dist.distributorName}</div>
                      <div className="text-[10px] text-[var(--text-secondary)] truncate max-w-[200px]">{dist.dbName}</div>
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">
                      <div className="font-medium text-[var(--text-primary)]">{dist.district}</div>
                      <div className="text-[10px] opacity-70">{dist.region} • {dist.plant}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        {dist.rsm && <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/5 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/10 w-fit whitespace-nowrap"><span className="opacity-50">RSM:</span> {dist.rsm}</span>}
                        {dist.asm && <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/5 text-purple-600 px-1.5 py-0.5 rounded border border-purple-500/10 w-fit whitespace-nowrap"><span className="opacity-50">ASM:</span> {dist.asm}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-[var(--text-secondary)]">
                      <div>{dist.mobile1}</div>
                      {dist.gst && <div className="text-[9px] opacity-60">GST: {dist.gst}</div>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-[var(--text-primary)]">
                      ₹{(dist.closing_balance || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${dist.status === 'Active'
                        ? 'bg-green-500/5 text-green-600 border-green-500/20'
                        : 'bg-red-500/5 text-red-600 border-red-500/20'
                        }`}>
                        <span className={`size-1 rounded-full ${dist.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {dist.status === 'Active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(dist)}
                          className="size-6 flex items-center justify-center rounded bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(dist.dbId)}
                          className="size-6 flex items-center justify-center rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 transition-all"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {isNewDistributor ? 'Register New Distributor' : 'Edit Distributor Details'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <form id="distributorForm" onSubmit={handleSave} className="grid grid-cols-3 gap-6">

                {/* Basic Info Group */}
                <div className="col-span-3 pb-2 border-b border-[var(--border-color)] mb-2">
                  <h4 className="text-[var(--color-primary)] text-xs font-bold uppercase tracking-widest">Basic Information</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">DB ID</label>
                  <input
                    required
                    type="number"
                    disabled={!isNewDistributor}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all font-mono placeholder-[var(--text-muted)]"
                    value={editingDistributor.dbId}
                    onChange={e => setEditingDistributor({ ...editingDistributor, dbId: parseInt(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Distributor Name</label>
                  <input
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingDistributor.distributorName}
                    onChange={e => setEditingDistributor({ ...editingDistributor, distributorName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">DB Name (Alias)</label>
                  <input
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingDistributor.dbName || ''}
                    onChange={e => setEditingDistributor({ ...editingDistributor, dbName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Status</label>
                  <select
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all"
                    value={editingDistributor.status}
                    onChange={e => setEditingDistributor({ ...editingDistributor, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Location Group */}
                <div className="col-span-3 pb-2 border-b border-[var(--border-color)] mb-2 mt-4">
                  <h4 className="text-[var(--color-primary)] text-xs font-bold uppercase tracking-widest">Location Details</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Region</label>
                  <input
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingDistributor.region || ''}
                    onChange={e => setEditingDistributor({ ...editingDistributor, region: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">District</label>
                  <input
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingDistributor.district || ''}
                    onChange={e => setEditingDistributor({ ...editingDistributor, district: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Tehsil</label>
                  <input
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingDistributor.tehsil || ''}
                    onChange={e => setEditingDistributor({ ...editingDistributor, tehsil: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Address</label>
                  <input
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingDistributor.address || ''}
                    onChange={e => setEditingDistributor({ ...editingDistributor, address: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Pin Code</label>
                  <input
                    type="number"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingDistributor.pin_code || ''}
                    onChange={e => setEditingDistributor({ ...editingDistributor, pin_code: parseInt(e.target.value) })}
                  />
                </div>

                {/* Hierarchy & Contact Group */}
                <div className="col-span-3 pb-2 border-b border-[var(--border-color)] mb-2 mt-4">
                  <h4 className="text-[var(--color-primary)] text-xs font-bold uppercase tracking-widest">Organization & Contact</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">RSM Name</label>
                  <select
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all font-mono"
                    value={editingDistributor.rsm_id || ''}
                    onChange={(e) => {
                      const selected = rsmList.find(r => r.user_id.toString() === e.target.value);
                      setEditingDistributor({
                        ...editingDistributor,
                        rsm_id: selected ? selected.user_id : undefined,
                        rsm: selected ? selected.user_name : ''
                      });
                    }}
                  >
                    <option value="">Select RSM</option>
                    {rsmList.map(rsm => (
                      <option key={rsm.user_id} value={rsm.user_id}>{rsm.user_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">ASM Name</label>
                  <select
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all font-mono"
                    value={editingDistributor.asm_id || ''}
                    onChange={(e) => {
                      const selected = asmList.find(a => a.user_id.toString() === e.target.value);
                      setEditingDistributor({
                        ...editingDistributor,
                        asm_id: selected ? selected.user_id : undefined,
                        asm: selected ? selected.user_name : ''
                      });
                    }}
                  >
                    <option value="">Select ASM</option>
                    {asmList.map(asm => (
                      <option key={asm.user_id} value={asm.user_id}>{asm.user_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">GST No.</label>
                  <input
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingDistributor.gst || ''}
                    onChange={e => setEditingDistributor({ ...editingDistributor, gst: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Mobile No 1</label>
                  <input
                    type="number"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingDistributor.mobile1 || ''}
                    onChange={e => setEditingDistributor({ ...editingDistributor, mobile1: parseInt(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Closing Balance</label>
                  <input
                    type="number"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)] font-mono"
                    value={editingDistributor.closing_balance || ''}
                    onChange={e => setEditingDistributor({ ...editingDistributor, closing_balance: parseFloat(e.target.value) })}
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-primary)] flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all font-bold text-xs uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="distributorForm"
                disabled={saveLoading}
                className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 transition-all font-bold text-xs uppercase tracking-widest shadow-lg flex items-center gap-2"
              >
                {saveLoading ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">save</span>}
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistributorMasterPage;
