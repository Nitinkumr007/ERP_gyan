
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserAccessMaster } from '../types';

interface UserProfileProps {
    currentUser: UserAccessMaster | null;
}

const UserProfile: React.FC<UserProfileProps> = ({ currentUser }) => {
    const [userData, setUserData] = useState<UserAccessMaster | null>(currentUser);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    // Form States
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');

    // Password Change State
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    useEffect(() => {
        if (currentUser) {
            setUserData(currentUser);
            setEmail(currentUser.email || '');
            setMobile(currentUser.mobile || '');
        }
    }, [currentUser]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData) return;
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('user_access_master')
                .update({ email, mobile })
                .eq('user_id', userData.user_id);

            if (error) throw error;
            setMessage('Profile updated successfully.');
        } catch (err: any) {
            setMessage('Error updating profile: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData) return;
        if (newPass !== confirmPass) {
            setMessage('New passwords do not match.');
            return;
        }
        setLoading(true);
        setMessage(null);

        try {
            // Allow change if old password matches (or if we skipped old password check because we trust the session... 
            // but strictly we should check old password)
            // Since we don't store plain text password in session securely, we verify against DB or relying on simple check if we had it.
            // For now, let's verify Old Password against what we know or re-query.

            const { data: verifyData, error: verifyError } = await supabase
                .from('user_access_master')
                .select('password_hash')
                .eq('user_id', userData.user_id)
                .single();

            if (verifyError || !verifyData) throw new Error('Verification failed.');

            if (verifyData.password_hash !== oldPass) {
                throw new Error('Old password is incorrect.');
            }

            const { error } = await supabase
                .from('user_access_master')
                .update({ password_hash: newPass })
                .eq('user_id', userData.user_id);

            if (error) throw error;

            setMessage('Password changed successfully.');
            setOldPass('');
            setNewPass('');
            setConfirmPass('');
        } catch (err: any) {
            setMessage('Error changing password: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!userData) return <div>Loading Profile...</div>;

    return (
        <div className="flex flex-col h-full animate-fadeIn max-w-4xl mx-auto space-y-8">
            <div className="bg-[var(--bg-panel)] p-8 rounded-2xl border border-[var(--border-color)] shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="size-24 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-black text-3xl shadow-lg">
                        {userData.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">{userData.user_name}</h1>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full bg-[var(--bg-secondary)] text-xs font-bold uppercase tracking-widest text-[var(--color-primary)] border border-[var(--border-color)]">
                                {userData.role}
                            </span>
                            <span className="text-[var(--text-muted)] text-sm font-mono">ID: {userData.emp_id}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Details Form */}
                <div className="bg-[var(--bg-panel)] p-8 rounded-2xl border border-[var(--border-color)] shadow-sm">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[var(--color-primary)]">badge</span>
                        Contact Information
                    </h2>
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Email Address</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Mobile Number</label>
                            <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none transition-colors" />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] font-bold py-3 rounded-xl border border-[var(--border-color)] transition-all uppercase tracking-widest text-xs">
                            Update Info
                        </button>
                    </form>
                </div>

                {/* Change Password Form */}
                <div className="bg-[var(--bg-panel)] p-8 rounded-2xl border border-[var(--border-color)] shadow-sm">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[var(--color-primary)]">lock_reset</span>
                        Security
                    </h2>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Current Password</label>
                            <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none transition-colors" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">New Password</label>
                            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none transition-colors" placeholder="Min. 6 characters" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Confirm New Password</label>
                            <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none transition-colors" />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all uppercase tracking-widest text-xs shadow-md mt-2">
                            Change Password
                        </button>
                    </form>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl text-center border ${message.includes('Error') ? 'bg-red-500/20 border-red-500/30 text-red-200' : 'bg-green-500/20 border-green-500/30 text-green-200'}`}>
                    <p className="font-bold text-sm tracking-wide">{message}</p>
                </div>
            )}
        </div>
    );
};

export default UserProfile;
