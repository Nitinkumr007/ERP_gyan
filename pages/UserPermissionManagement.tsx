
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserAccessMaster, UserMenuPermissions } from '../types';

interface UserPermissionManagementProps {
    onNavigate?: (page: any) => void;
}

const UserPermissionManagement: React.FC<UserPermissionManagementProps> = () => {
    const [users, setUsers] = useState<UserAccessMaster[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserAccessMaster | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);

    // Default permissions if none exist
    const defaultPermissions: UserMenuPermissions = {
        access_product_master: false,
        access_user_management: false,
        access_user_permissions: false,
        access_distributor_control: false,
        access_sales_hierarchy: false,
        access_partner_network: false,
        access_system_settings: false,
        access_dashboard: true,
        access_reports_center: false,
        access_order_history: false,
        access_dbr_balance: false,
        access_system_demands: false,

        access_report_demand_log: false,
        access_report_pending_orders: false,
        access_report_plant_summary: false,
        access_report_distributor_db: false,
        access_report_high_balances: false,
        access_report_product_catalog: false,
        access_report_user_roles: false,
        access_new_demand: false,
        access_upload_balance: false,
    };

    const [currentPermissions, setCurrentPermissions] = useState<UserMenuPermissions>(defaultPermissions);
    const [capabilities, setCapabilities] = useState({
        can_add: false,
        can_modify: false,
        can_delete: false,
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        const fetchPermissions = async () => {
            if (selectedUser) {
                // Fetch capabilities from user object (already populated)
                setCapabilities({
                    can_add: selectedUser.can_add || false,
                    can_modify: selectedUser.can_modify || false,
                    can_delete: selectedUser.can_delete || false,
                });

                // Fetch Menu Permissions from DB
                const { data, error } = await supabase
                    .from('user_menu_permissions')
                    .select('*')
                    .eq('emp_id', selectedUser.emp_id)
                    .single();

                if (data) {
                    setCurrentPermissions(data);
                } else {
                    // Reset to defaults if no entry found
                    setCurrentPermissions(defaultPermissions);
                }
            }
        };

        fetchPermissions();
    }, [selectedUser]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_access_master')
                .select('*')
                .order('user_name');

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionChange = (key: keyof UserMenuPermissions) => {
        setCurrentPermissions(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleCapabilityChange = (key: 'can_add' | 'can_modify' | 'can_delete') => {
        setCapabilities(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = async () => {
        if (!selectedUser) return;
        setSaving(true);

        try {
            // 1. Update basic capabilities in User_Access_Master
            const { error: userError } = await supabase
                .from('user_access_master')
                .update({
                    can_add: capabilities.can_add,
                    can_modify: capabilities.can_modify,
                    can_delete: capabilities.can_delete
                })
                .eq('emp_id', selectedUser.emp_id);

            if (userError) throw userError;

            // 2. Update/Insert menu permissions
            const { error: permError } = await supabase
                .from('user_menu_permissions')
                .upsert({
                    emp_id: selectedUser.emp_id,
                    ...currentPermissions,
                    updated_at: new Date().toISOString()
                });

            if (permError) throw permError;

            console.log('Saving permissions for', selectedUser.emp_id, currentPermissions);

            // Optimistically update local state
            setUsers(prev => prev.map(u =>
                u.emp_id === selectedUser.emp_id
                    ? { ...u, ...capabilities, permissions: currentPermissions }
                    : u
            ));

            alert('Permissions updated successfully! The application will refresh to apply changes.');

            // Reload the application to apply changes (especially if modifying own permissions, but good practice to ensure fresh state)
            window.location.reload();

        } catch (error: any) {
            console.error('Error saving permissions:', error);
            alert(`Failed to save permissions: ${error.message || error}`);
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.emp_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-full gap-6">
            {/* Left Panel: User List */}
            <div className="w-1/3 bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-color)] flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl">
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-forest-900/30 to-transparent">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-gold-400">group</span>
                        Select User
                    </h2>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="Search by Name or Emp ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[var(--bg-primary)]/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-gold-400/50 transition-colors"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {loading ? (
                        <div className="text-center p-8 text-gray-400">Loading users...</div>
                    ) : (
                        filteredUsers.map(user => (
                            <div
                                key={user.emp_id}
                                onClick={() => setSelectedUser(user)}
                                className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedUser?.emp_id === user.emp_id
                                    ? 'bg-forest-800/80 border-gold-400/30 shadow-lg'
                                    : 'hover:bg-white/5 border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold ${selectedUser?.emp_id === user.emp_id ? 'bg-gold-400 text-forest-950' : 'bg-forest-700 text-gray-300'
                                        }`}>
                                        {user.user_name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold ${selectedUser?.emp_id === user.emp_id ? 'text-white' : 'text-gray-200'}`}>
                                            {user.user_name}
                                        </h3>
                                        <p className="text-xs text-gray-500 font-mono">{user.emp_id} • {user.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Panel: Permissions Matrix */}
            <div className="flex-1 bg-[var(--bg-panel)] rounded-3xl border border-[var(--border-color)] flex flex-col overflow-hidden shadow-2xl backdrop-blur-xl">
                {selectedUser ? (
                    <>
                        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-forest-900/30 to-transparent flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-gold-400">lock_person</span>
                                    Access Control
                                </h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    Manage permissions for <span className="text-gold-400 font-medium">{selectedUser.user_name}</span>
                                </p>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-forest-950 px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-gold-400/20 active:scale-95 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-lg">save</span>
                                )}
                                Save Changes
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* 1. MASTERS */}
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-purple-500/20 rounded-lg">
                                            <span className="material-symbols-outlined text-purple-400">database</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Masters Access</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <PermissionToggle
                                            label="System Settings"
                                            checked={currentPermissions.access_system_settings}
                                            onChange={() => handlePermissionChange('access_system_settings')}
                                            icon="settings"
                                        />
                                        <PermissionToggle
                                            label="User Management"
                                            checked={currentPermissions.access_user_management}
                                            onChange={() => handlePermissionChange('access_user_management')}
                                            icon="group"
                                        />
                                        <PermissionToggle
                                            label="User Permissions"
                                            checked={currentPermissions.access_user_permissions}
                                            onChange={() => handlePermissionChange('access_user_permissions')}
                                            icon="lock_person"
                                        />
                                        <PermissionToggle
                                            label="Product Master"
                                            checked={currentPermissions.access_product_master}
                                            onChange={() => handlePermissionChange('access_product_master')}
                                            icon="inventory_2"
                                        />
                                        <PermissionToggle
                                            label="Distributor Control"
                                            checked={currentPermissions.access_distributor_control}
                                            onChange={() => handlePermissionChange('access_distributor_control')}
                                            icon="hub"
                                        />
                                        <PermissionToggle
                                            label="Sales Hierarchy"
                                            checked={currentPermissions.access_sales_hierarchy}
                                            onChange={() => handlePermissionChange('access_sales_hierarchy')}
                                            icon="account_tree"
                                        />
                                        <PermissionToggle
                                            label="Partner Network"
                                            checked={currentPermissions.access_partner_network}
                                            onChange={() => handlePermissionChange('access_partner_network')}
                                            icon="handshake"
                                        />
                                    </div>
                                </div>

                                {/* 2. REPORTS */}
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-blue-500/20 rounded-lg">
                                            <span className="material-symbols-outlined text-blue-400">analytics</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Reports & Analysis</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <PermissionToggle
                                            label="System Overview (Dashboard)"
                                            checked={currentPermissions.access_dashboard}
                                            onChange={() => handlePermissionChange('access_dashboard')}
                                            icon="dashboard"
                                        />
                                        <PermissionToggle
                                            label="Reports Center"
                                            checked={currentPermissions.access_reports_center}
                                            onChange={() => handlePermissionChange('access_reports_center')}
                                            icon="download"
                                        />
                                        <PermissionToggle
                                            label="Order History"
                                            checked={currentPermissions.access_order_history}
                                            onChange={() => handlePermissionChange('access_order_history')}
                                            icon="history"
                                        />
                                        <PermissionToggle
                                            label="DBR Balance"
                                            checked={currentPermissions.access_dbr_balance}
                                            onChange={() => handlePermissionChange('access_dbr_balance')}
                                            icon="account_balance_wallet"
                                        />
                                        <PermissionToggle
                                            label="System Demands"
                                            checked={currentPermissions.access_system_demands}
                                            onChange={() => handlePermissionChange('access_system_demands')}
                                            icon="heap_snapshot_large"
                                        />
                                    </div>
                                </div>

                                {/* NEW: DETAILED REPORTS CARD */}
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                                        <div className="p-2 bg-orange-500/20 rounded-lg shadow-inner">
                                            <span className="material-symbols-outlined text-orange-400">summarize</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Detailed Reports</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <PermissionToggle
                                            label="Demand Log"
                                            checked={!!currentPermissions.access_report_demand_log}
                                            onChange={() => handlePermissionChange('access_report_demand_log')}
                                            icon="receipt_long"
                                        />
                                        <PermissionToggle
                                            label="Pending Orders"
                                            checked={!!currentPermissions.access_report_pending_orders}
                                            onChange={() => handlePermissionChange('access_report_pending_orders')}
                                            icon="pending_actions"
                                        />
                                        <PermissionToggle
                                            label="Plant Summary"
                                            checked={!!currentPermissions.access_report_plant_summary}
                                            onChange={() => handlePermissionChange('access_report_plant_summary')}
                                            icon="factory"
                                        />
                                        <PermissionToggle
                                            label="Distributor DB"
                                            checked={!!currentPermissions.access_report_distributor_db}
                                            onChange={() => handlePermissionChange('access_report_distributor_db')}
                                            icon="store"
                                        />
                                        <PermissionToggle
                                            label="High Balances"
                                            checked={!!currentPermissions.access_report_high_balances}
                                            onChange={() => handlePermissionChange('access_report_high_balances')}
                                            icon="money_off"
                                        />
                                        <PermissionToggle
                                            label="Product Catalog"
                                            checked={!!currentPermissions.access_report_product_catalog}
                                            onChange={() => handlePermissionChange('access_report_product_catalog')}
                                            icon="inventory_2"
                                        />
                                        <PermissionToggle
                                            label="User Roles"
                                            checked={!!currentPermissions.access_report_user_roles}
                                            onChange={() => handlePermissionChange('access_report_user_roles')}
                                            icon="group"
                                        />
                                    </div>
                                </div>

                                {/* 3. DEMAND USER */}
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-green-500/20 rounded-lg">
                                            <span className="material-symbols-outlined text-green-400">shopping_cart</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Demand User</h3>
                                    </div>

                                    <div className="space-y-3">
                                        <PermissionToggle
                                            label="New Demand"
                                            checked={currentPermissions.access_new_demand}
                                            onChange={() => handlePermissionChange('access_new_demand')}
                                            icon="add_shopping_cart"
                                        />
                                        <PermissionToggle
                                            label="Upload Balance"
                                            checked={currentPermissions.access_upload_balance}
                                            onChange={() => handlePermissionChange('access_upload_balance')}
                                            icon="upload_file"
                                        />
                                    </div>
                                </div>

                                {/* 4. OPERATIONAL CAPABILITIES */}
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-red-500/20 rounded-lg">
                                            <span className="material-symbols-outlined text-red-400">admin_panel_settings</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Operational Perms.</h3>
                                    </div>

                                    <div className="space-y-4">
                                        <PermissionCheckbox
                                            label="Can Add Records"
                                            checked={capabilities.can_add}
                                            onChange={() => handleCapabilityChange('can_add')}
                                        />
                                        <PermissionCheckbox
                                            label="Can Modify Records"
                                            checked={capabilities.can_modify}
                                            onChange={() => handleCapabilityChange('can_modify')}
                                        />
                                        <PermissionCheckbox
                                            label="Can Delete Records"
                                            checked={capabilities.can_delete}
                                            onChange={() => handleCapabilityChange('can_delete')}
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <div className="size-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-4xl opacity-50">person_search</span>
                        </div>
                        <p className="text-lg">Select a user from the list to manage permissions</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const PermissionToggle = ({ label, checked, onChange, icon }: { label: string, checked: boolean, onChange: () => void, icon: string }) => (
    <div
        onClick={onChange}
        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${checked
            ? 'bg-gold-400/10 border-gold-400/50'
            : 'bg-transparent border-white/5 hover:bg-white/5'
            }`}
    >
        <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined text-xl ${checked ? 'text-gold-400' : 'text-gray-500'}`}>{icon}</span>
            <span className={`text-sm font-medium ${checked ? 'text-white' : 'text-gray-400'}`}>{label}</span>
        </div>

        <div className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-gold-400' : 'bg-gray-600'}`}>
            <div className={`absolute top-1 size-3 rounded-full bg-forest-950 transition-all ${checked ? 'left-6' : 'left-1'}`}></div>
        </div>
    </div>
);

const PermissionCheckbox = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) => (
    <label className="flex items-center gap-3 cursor-pointer group">
        <div className={`size-5 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-red-500 border-red-500' : 'border-gray-500 group-hover:border-red-400'
            }`}>
            {checked && <span className="material-symbols-outlined text-sm text-white font-bold">check</span>}
        </div>
        <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
        <span className={`text-sm font-medium ${checked ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>{label}</span>
    </label>
);

export default UserPermissionManagement;
