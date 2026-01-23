
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserAccessMaster } from '../types';

interface LoginProps {
  onLogin: (user: UserAccessMaster) => void;
  toggleTheme: () => void;
  currentTheme: 'dark' | 'light';
}

const Login: React.FC<LoginProps> = ({ onLogin, toggleTheme, currentTheme }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password State
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'VERIFY' | 'RESET'>('VERIFY');
  const [resetData, setResetData] = useState({ emp_id: '', email: '', mobile: '', new_pass: '', confirm_pass: '' });
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Attempting login with:', { empId });

      // Query using emp_id. We fetch the user record first.
      const { data, error } = await supabase
        .from('user_access_master')
        .select('*')
        .eq('emp_id', empId)
        .single();

      if (error || !data) {
        console.error('Supabase error:', error);
        setError('Account not found (Invalid Employee ID).');
        setLoading(false);
        return;
      }

      console.log('User found:', data.user_name);

      if (data.password_hash !== password) {
        setError('Invalid password.');
        setLoading(false);
        return;
      }

      if (data.is_active === false) {
        setError('Account is disabled. Contact system administrator.');
        setLoading(false);
        return;
      }

      const isAdmin = (data.role && data.role.toLowerCase() === 'admin') ||
        (data.emp_designation && data.emp_designation.toLowerCase().includes('admin'));

      if (isAdminMode && !isAdmin) {
        setError('Access Denied: You do not have Admin privileges.');
        setLoading(false);
        return;
      }

      // Fetch Permissions
      const { data: permData, error: permError } = await supabase
        .from('user_menu_permissions')
        .select('*')
        .eq('emp_id', empId)
        .single();

      const fullUser: UserAccessMaster = {
        ...data,
        permissions: permData || undefined
      };

      // Pass full user object
      onLogin(fullUser);

    } catch (err: any) {
      setError(`Login failed: ${err.message || 'Unknown error'}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);

    try {
      const { data, error } = await supabase
        .from('user_access_master')
        .select('*')
        .eq('emp_id', resetData.emp_id)
        .single();

      if (error || !data) {
        setResetError('Employee ID not found.');
        setResetLoading(false);
        return;
      }

      // Verify Email and Mobile
      const dbEmail = (data.email || '').trim().toLowerCase();
      const inputEmail = resetData.email.trim().toLowerCase();
      const dbMobile = (data.mobile || '').trim();
      const inputMobile = resetData.mobile.trim();

      if (dbEmail !== inputEmail || dbMobile !== inputMobile) {
        setResetError('Verification failed. Email or Mobile does not match our records.');
        setResetLoading(false);
        return;
      }

      setForgotStep('RESET');
    } catch (err: any) {
      console.log(err);
      setResetError(`Verification failed: ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetData.new_pass !== resetData.confirm_pass) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      const { error } = await supabase
        .from('user_access_master')
        .update({ password_hash: resetData.new_pass })
        .eq('emp_id', resetData.emp_id);

      if (error) throw error;

      alert('Password updated successfully! Please login with your new password.');
      setIsForgotOpen(false);
      setForgotStep('VERIFY');
      setResetData({ emp_id: '', email: '', mobile: '', new_pass: '', confirm_pass: '' });
    } catch (err: any) {
      console.log(err);
      setResetError(`Failed to update password: ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-background text-primary font-sans relative transition-colors duration-300">
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/5 border border-white/10 text-primary hover:bg-white/10 transition-all z-20 shadow-lg backdrop-blur-sm"
        title={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
      >
        <span className="material-symbols-outlined text-xl">
          {currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
        </span>
      </button>

      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAZccoZV_2n7tFUUmEUrPgQymU1dCJQ40CwdTiE7iv-SO1AXUb4oGsGYxetQARFvIbDP7vgEbBHGS9JVIvvYNKca3NIKLGDj1u7m4yYw1HePlDrYMpBc83_wcl_IPLWf5EFJ9QosgVU12ANS_7CHzNfJajtccrn57ooYJnMAc9epMWrECQU4kJSdA5mAt5WAl-ZKb6RkMQ3MYVFwYUp9Ka5JJE7BHPHkA_KZZ4ReGh0rgJDKUcH9iSozhkon8wGrr_336u773ELYJc")' }}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 backdrop-brightness-75"></div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="size-12 flex items-center justify-center border-2 border-[var(--color-secondary)] rounded-full">
            <span className="material-symbols-outlined text-[var(--color-secondary)] text-2xl">agriculture</span>
          </div>
          <h2 className="text-xl font-bold tracking-widest text-white uppercase">Demand App</h2>
        </div>
        <div className="relative z-10">
          <h1 className="text-7xl font-display font-bold text-white leading-tight mb-4">
            Welcome to <br />
            <span className="text-[var(--color-secondary)]">Demand App</span>
          </h1>
          <p className="text-xl text-white/80 font-light max-w-md tracking-wide leading-relaxed">
            Precision nutrition for the future of livestock. Access your dashboard and manage cattle feed solutions with excellence.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-6 text-white/60 text-xs font-medium uppercase tracking-[0.2em]">
          <span>Est. 2024</span>
          <span className="w-8 h-[1px] bg-[var(--color-secondary)]/50"></span>
          <span>Premium Industry Standards</span>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative bg-[var(--bg-primary)]">
        {/* <div className="absolute inset-0 bg-background/95 backdrop-blur-3xl z-0"></div> */}
        <div className="w-full max-w-md relative z-10">
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-2">Sign In</h2>
            <p className="text-[var(--text-secondary)]">Enter your credentials to access your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-4 p-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-fit mb-8">
              <button
                type="button"
                onClick={() => setIsAdminMode(false)}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${!isAdminMode ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => setIsAdminMode(true)}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${isAdminMode ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                Admin
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Employee ID</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">badge</span>
                  <input
                    type="text"
                    required
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/50 transition-all placeholder-[var(--text-muted)]"
                    placeholder="Enter your ID"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2">Password</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">lock</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[var(--bg-panel)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl py-4 pl-12 pr-12 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/50 transition-all placeholder-[var(--text-muted)]"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsForgotOpen(true)}
                className="text-xs font-medium text-[var(--color-primary)] hover:underline transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-3">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">sync</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-[var(--text-secondary)]">
            By signing in, you agree to the <a href="#" className="text-[var(--color-primary)] hover:underline">Terms of Service</a> and <a href="#" className="text-[var(--color-primary)] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-8 shadow-2xl relative">
            <button
              onClick={() => setIsForgotOpen(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Reset Password</h3>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              {forgotStep === 'VERIFY' ? 'Verify your identity to continue.' : 'Enter your new password.'}
            </p>

            {forgotStep === 'VERIFY' ? (
              <form onSubmit={handleVerifyReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Employee ID</label>
                  <input
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    value={resetData.emp_id}
                    onChange={e => setResetData({ ...resetData, emp_id: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Registered Email</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    value={resetData.email}
                    onChange={e => setResetData({ ...resetData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Registered Mobile</label>
                  <input
                    type="tel"
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    value={resetData.mobile}
                    onChange={e => setResetData({ ...resetData, mobile: e.target.value })}
                  />
                </div>
                {resetError && <p className="text-red-500 text-xs">{resetError}</p>}
                <button type="submit" disabled={resetLoading} className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold shadow-sm">
                  {resetLoading ? 'Verifying...' : 'Verify Identity'}
                </button>
              </form>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    value={resetData.new_pass}
                    onChange={e => setResetData({ ...resetData, new_pass: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] focus:border-[var(--color-primary)] outline-none"
                    value={resetData.confirm_pass}
                    onChange={e => setResetData({ ...resetData, confirm_pass: e.target.value })}
                  />
                </div>
                {resetError && <p className="text-red-500 text-xs">{resetError}</p>}
                <button type="submit" disabled={resetLoading} className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white py-3 rounded-xl font-bold">
                  {resetLoading ? 'Updating...' : 'Set New Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
