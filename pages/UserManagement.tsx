
import React, { useState, useEffect } from 'react';
import { AppState, UserAccessMaster } from '../types';
import { supabase } from '../supabaseClient';

interface UserManagementProps {
  onNavigate: (page: AppState) => void;
}

const UserManagementPage: React.FC<UserManagementProps> = ({ onNavigate }) => {
  const [users, setUsers] = useState<UserAccessMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState({
    empId: '',
    userName: '',
    role: '',
    contact: '',
    status: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserAccessMaster>>({});
  const [isNewUser, setIsNewUser] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_access_master')
        .select('*')
        .order('user_id', { ascending: true });

      if (error) throw error;
      if (data) {
        // Normalize
        setUsers(data.map((u: any) => ({
          ...u,
          user_name: u.user_name || '',
          emp_id: u.emp_id || '',
          role: u.role || 'User',
          emp_designation: u.emp_designation || '',
          email: u.email || '',
          mobile: u.mobile || ''
        })));
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingUser({
      user_name: '',
      emp_id: '',
      emp_designation: '',
      role: 'User',
      password_hash: '',
      email: '',
      mobile: '',
      is_active: true
    });
    setIsNewUser(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserAccessMaster) => {
    setEditingUser({ ...user });
    setIsNewUser(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const payload = {
        ...editingUser,
        // Ensure we don't send empty ID for new inserts if database handles it, 
        // but here we likely need to just exclude 'user_id' if it's undefined
      };

      if (isNewUser) {
        const { error } = await supabase.from('user_access_master').insert([payload]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_access_master')
          .update(payload)
          .eq('user_id', editingUser.user_id);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert('Error saving user: ' + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to revoke access for this user?')) return;
    try {
      const { error } = await supabase.from('user_access_master').delete().eq('user_id', id);
      if (error) throw error;
      fetchUsers();
    } catch (err: any) {
      alert('Error deleting user: ' + err.message);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredUsers = users.filter(u => {
    // 1. Global Search (OR)
    const matchesSearch =
      (u.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.emp_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.role || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Column Filters (AND)
    if (filters.userName && !(u.user_name || '').toLowerCase().includes(filters.userName.toLowerCase())) return false;
    if (filters.empId && !(u.emp_id || '').toLowerCase().includes(filters.empId.toLowerCase())) return false;
    if (filters.role && !(u.role || '').toLowerCase().includes(filters.role.toLowerCase())) return false;

    // Composite contact filter
    if (filters.contact) {
      const contact = filters.contact.toLowerCase();
      const matchesContact =
        (u.mobile || '').toLowerCase().includes(contact) ||
        (u.email || '').toLowerCase().includes(contact);
      if (!matchesContact) return false;
    }

    if (filters.status) {
      const statusTerm = filters.status.toLowerCase();
      const statusText = u.is_active ? 'active' : 'disabled';
      if (!statusText.includes(statusTerm)) return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full space-y-4 animate-fadeIn">
      {/* Header / Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-6 bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] shadow-sm backdrop-blur-md transition-colors duration-300 gap-4">
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center border border-[var(--color-primary)]/20 text-[var(--color-primary)] shadow-sm">
            <span className="material-symbols-outlined">group</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-wide">User Management</h1>
            <p className="text-xs text-[var(--text-secondary)] font-medium">Control access and permissions</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative group w-full md:w-auto">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">search</span>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] w-full md:w-64 transition-all placeholder-[var(--text-muted)]"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchUsers}
              className="p-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
            </button>
            <button
              onClick={() => onNavigate('SALES_HIERARCHY')}
              className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] font-bold text-xs uppercase tracking-wide rounded-xl transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">account_tree</span>
              Map Hierarchy
            </button>
            <button
              onClick={handleOpenAdd}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] hover:opacity-90 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] backdrop-blur-md overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-[var(--bg-panel)] border-b border-[var(--border-color)] backdrop-blur-xl">
              <tr className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                <th className="px-4 py-3">User Profile</th>
                <th className="px-4 py-3">Role & Designation</th>
                <th className="px-4 py-3">Contact Access</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
              {/* Filter Row */}
              <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                <th className="px-2 py-1">
                  <input
                    placeholder="Search User / ID..."
                    value={filters.userName}
                    onChange={e => handleFilterChange('userName', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none placeholder-[var(--text-muted)]"
                  />
                </th>
                <th className="px-2 py-1">
                  <select
                    value={filters.role}
                    onChange={e => handleFilterChange('role', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none appearance-none"
                  >
                    <option value="">All Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="User">User</option>
                    <option value="Manager">Manager</option>
                    <option value="Distributor">Distributor</option>
                  </select>
                </th>
                <th className="px-2 py-1">
                  <input
                    placeholder="Email/Mobile..."
                    value={filters.contact}
                    onChange={e => handleFilterChange('contact', e.target.value)}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none placeholder-[var(--text-muted)]"
                  />
                </th>
                <th className="px-2 py-1 text-center">
                  <input
                    placeholder="St"
                    value={filters.status}
                    onChange={e => handleFilterChange('status', e.target.value)}
                    className="w-12 mx-auto bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10px] text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none text-center placeholder-[var(--text-muted)]"
                  />
                </th>
                <th className="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] text-xs">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">No users found.</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.user_id} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-xs border border-[var(--color-primary)]/20">
                          {user.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text-primary)]">{user.user_name}</div>
                          <div className="text-[10px] font-mono text-[var(--text-secondary)] opacity-80">{user.emp_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${user.role === 'Admin'
                          ? 'bg-purple-500/10 text-purple-600 border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          }`}>
                          {user.role}
                        </span>
                        <span className="text-[10px] text-[var(--text-secondary)]">{user.emp_designation || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-[var(--text-secondary)] space-y-0.5">
                      <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px] opacity-50">mail</span> {user.email || '-'}</div>
                      <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[12px] opacity-50">call</span> {user.mobile || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${user.is_active
                        ? 'bg-green-500/10 text-green-600 border-green-500/20'
                        : 'bg-red-500/10 text-red-600 border-red-500/20'
                        }`}>
                        <span className={`size-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {user.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="size-7 flex items-center justify-center rounded bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 transition-all"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(user.user_id)}
                          className="size-7 flex items-center justify-center rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 transition-all"
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
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                {isNewUser ? 'Create New User' : 'Edit User Access'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <form id="userForm" onSubmit={handleSave} className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Full Name</label>
                  <input
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingUser.user_name}
                    onChange={e => setEditingUser({ ...editingUser, user_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Employee ID</label>
                  <input
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all font-mono placeholder-[var(--text-muted)]"
                    value={editingUser.emp_id}
                    onChange={e => setEditingUser({ ...editingUser, emp_id: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Designation</label>
                  <input
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingUser.emp_designation || ''}
                    onChange={e => setEditingUser({ ...editingUser, emp_designation: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Role</label>
                  <select
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all"
                    value={editingUser.role}
                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                  >
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="ASM">ASM</option>
                    <option value="RSM">RSM</option>
                    <option value="GM">GM</option>
                    <option value="Sales Head">Sales Head</option>
                    <option value="Distributor">Distributor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Status</label>
                  <div className="flex items-center gap-4 h-[46px]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        className="text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        checked={editingUser.is_active === true}
                        onChange={() => setEditingUser({ ...editingUser, is_active: true })}
                      />
                      <span className="text-sm text-[var(--text-primary)]">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        className="text-red-500 focus:ring-red-500"
                        checked={editingUser.is_active === false}
                        onChange={() => setEditingUser({ ...editingUser, is_active: false })}
                      />
                      <span className="text-sm text-[var(--text-muted)]">Disabled</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Email</label>
                  <input
                    type="email"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingUser.email || ''}
                    onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">Mobile</label>
                  <input
                    type="tel"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    value={editingUser.mobile || ''}
                    onChange={e => setEditingUser({ ...editingUser, mobile: e.target.value })}
                  />
                </div>

                <div className="col-span-2 pt-4 border-t border-[var(--border-color)]">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5">
                    {isNewUser ? 'Set Password' : 'Change Password (Optional)'}
                  </label>
                  <input
                    type="password"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] focus:ring-0 outline-none transition-all placeholder-[var(--text-muted)]"
                    placeholder={isNewUser ? "Enter initial password" : "Leave blank to keep current password"}
                    value={editingUser.password_hash || ''}
                    onChange={e => setEditingUser({ ...editingUser, password_hash: e.target.value })}
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
                form="userForm"
                disabled={saveLoading}
                className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 transition-all font-bold text-xs uppercase tracking-widest shadow-lg flex items-center gap-2"
              >
                {saveLoading ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">save</span>}
                Save User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
