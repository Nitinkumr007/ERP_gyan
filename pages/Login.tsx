
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { UserAccessMaster } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface LoginProps {
  onLogin: (user: UserAccessMaster, sessionId: string) => void;
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

  // Force Login State
  const [showForceLogin, setShowForceLogin] = useState(false);
  const [pendingUser, setPendingUser] = useState<UserAccessMaster | null>(null);

  // Forgot Password State
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'VERIFY' | 'RESET'>('VERIFY');
  const [resetData, setResetData] = useState({ emp_id: '', email: '', mobile: '', new_pass: '', confirm_pass: '' });
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Helper to log history (Audit Trail)
  const logAttempt = async (
    status: 'SUCCESS' | 'FAILED',
    reason: string | null,
    user?: UserAccessMaster,
    inSessionId?: string
  ) => {
    try {
      const userAgent = navigator.userAgent;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
      let ip = null;
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        if (res.ok) {
          const data = await res.json();
          ip = data.ip;
        }
      } catch (e) { /* Ignore */ }

      await supabase.from('user_login_log').insert([{
        emp_id: user?.emp_id || empId,
        user_name: user?.user_name || null,
        role: user?.role || null,
        session_id: inSessionId || uuidv4(),
        login_status: status,
        failure_reason: reason,
        device_type: isMobile ? 'Mobile' : 'Desktop',
        browser: userAgent,
        os: navigator.platform,
        ip_address: ip
      }]);
    } catch (logErr) {
      console.error("Failed to log login attempt:", logErr);
    }
  };

  const createSession = async (user: UserAccessMaster, sessionId: string) => {
    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    let ip = null;
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      if (res.ok) {
        const data = await res.json();
        ip = data.ip;
      }
    } catch (e) { /* Ignore */ }

    // 50 minutes expiry
    const expiresAt = new Date(Date.now() + 50 * 60 * 1000).toISOString();

    const { error } = await supabase.from('user_sessions').insert([{
      session_id: sessionId,
      emp_id: user.emp_id,
      user_name: user.user_name,
      role: user.role,
      is_active: true,
      expires_at: expiresAt,
      device_type: isMobile ? 'Mobile' : 'Desktop',
      browser: userAgent,
      os: navigator.platform,
      ip_address: ip
    }]);

    if (error) throw error;
  };

  const proceedWithLogin = async (user: UserAccessMaster, force: boolean = false) => {
    setLoading(true);
    const newSessionId = uuidv4();

    try {
      if (force) {
        // Deactivate all other sessions for this user
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('emp_id', user.emp_id)
          .eq('is_active', true);
      }

      // Create new session entry
      await createSession(user, newSessionId);

      // Log History Success
      await logAttempt('SUCCESS', force ? 'Force Login' : null, user, newSessionId);

      // Complete Login
      onLogin(user, newSessionId);

    } catch (err: any) {
      console.error("Session creation failed", err);
      setError("Failed to create session. Please try again.");
      await logAttempt('FAILED', `Session Creation Error: ${err.message}`, user, newSessionId);
    } finally {
      setLoading(false);
      setShowForceLogin(false);
      setPendingUser(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const tempSessionId = uuidv4(); // For logging failures

    try {
      // 1. Verify User Credentials
      const { data, error } = await supabase
        .from('user_access_master')
        .select('*')
        .eq('emp_id', empId)
        .single();

      if (error || !data) {
        setError('Account not found (Invalid Employee ID).');
        await logAttempt('FAILED', 'Invalid/Not Found Employee ID', undefined, tempSessionId);
        setLoading(false);
        return;
      }

      if (data.password_hash !== password) {
        setError('Invalid password.');
        await logAttempt('FAILED', 'Incorrect Password', data, tempSessionId);
        setLoading(false);
        return;
      }

      if (data.is_active === false) {
        setError('Account is disabled. Contact system administrator.');
        await logAttempt('FAILED', 'Account Disabled', data, tempSessionId);
        setLoading(false);
        return;
      }

      const isAdmin = (data.role && data.role.toLowerCase() === 'admin') ||
        (data.emp_designation && data.emp_designation.toLowerCase().includes('admin'));

      if (isAdminMode && !isAdmin) {
        setError('Access Denied: You do not have Admin privileges.');
        await logAttempt('FAILED', 'Admin Mode Requested by Non-Admin', data, tempSessionId);
        setLoading(false);
        return;
      }

      // Fetch Permissions
      const { data: permData } = await supabase
        .from('user_menu_permissions')
        .select('*')
        .eq('emp_id', empId)
        .single();

      const fullUser: UserAccessMaster = {
        ...data,
        permissions: permData || undefined
      };

      // 2. Check for Existing Active Session
      const { data: activeSessions } = await supabase
        .from('user_sessions')
        .select('session_id')
        .eq('emp_id', empId)
        .eq('is_active', true);

      if (activeSessions && activeSessions.length > 0) {
        // Found active session -> Prompt Force Login
        setPendingUser(fullUser);
        setShowForceLogin(true);
        setLoading(false); // Stop loading UI to show modal
        return;
      }

      // No active session -> Proceed
      await proceedWithLogin(fullUser, false);

    } catch (err: any) {
      setError(`Login failed: ${err.message || 'Unknown error'}`);
      console.error(err);
      await logAttempt('FAILED', `System Error: ${err.message}`, undefined, tempSessionId);
      setLoading(false);
    }
  };

  const handleForceLoginConfirm = () => {
    if (pendingUser) {
      proceedWithLogin(pendingUser, true);
    }
  };

  const handleForceLoginCancel = () => {
    setShowForceLogin(false);
    setPendingUser(null);
    setError("Login cancelled. Existing session remains active.");
  };

  // Reset Password Handlers... (Keeping these logic blocks)
  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);

    try {
      const { data, error } = await supabase
        .from('user_access_master')
        .select('emp_id, email, mobile')
        .eq('emp_id', resetData.emp_id)
        .single();

      if (error || !data) {
        setResetError('Employee ID not found.');
      } else if (data.email?.toLowerCase() !== resetData.email.toLowerCase()) {
        setResetError('Email does not match our records.');
      } else {
        setForgotStep('RESET');
      }
    } catch (err) {
      setResetError('Verification failed.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetData.new_pass !== resetData.confirm_pass) {
      setResetError('Passwords do not match.');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase
        .from('user_access_master')
        .update({ password_hash: resetData.new_pass })
        .eq('emp_id', resetData.emp_id);
      if (error) throw error;
      alert('Password reset successful. Please login.');
      setIsForgotOpen(false);
      setForgotStep('VERIFY');
      setResetData({ emp_id: '', email: '', mobile: '', new_pass: '', confirm_pass: '' });
    } catch (err) {
      setResetError('Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-[#050B14]">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#0F1E16] to-[#050B08] p-16 relative flex-col justify-between overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-green-900/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-full border border-green-500/30 flex items-center justify-center bg-green-900/20 text-green-400">
              <span className="material-symbols-outlined">agriculture</span>
            </div>
            <h2 className="text-white font-bold tracking-widest text-sm uppercase">Demand App</h2>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="text-6xl font-black text-white leading-tight mb-2">
            Welcome to
          </h1>
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600 leading-tight mb-8">
            Demand App
          </h1>
          <p className="text-gray-400 text-lg max-w-md font-medium leading-relaxed">
            Precision nutrition for the future of livestock.
            Access your dashboard and manage cattle feed solutions with excellence.
          </p>
        </div>

        <div className="relative z-10 flex justify-between items-end border-t border-white/5 pt-8">
          <div className="text-xs font-black tracking-[0.2em] text-gray-500 uppercase">
            Est. 2024
          </div>
          <div className="text-xs font-black tracking-[0.2em] text-gray-500 uppercase">
            Premium Industry Standards
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="absolute top-8 right-8">
          <button
            onClick={toggleTheme}
            className="size-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">
              {currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">Sign In</h2>
            <p className="text-gray-500">Enter your credentials to access your account.</p>
          </div>

          <div className="mb-8 p-1 bg-white/5 rounded-lg inline-flex relative">
            <button
              onClick={() => setIsAdminMode(false)}
              className={`px-8 py-2 rounded-md text-sm font-bold transition-all ${!isAdminMode ? 'bg-[#0F1522] text-white shadow-lg border border-white/5' : 'text-gray-500 hover:text-gray-300'}`}
            >
              User
            </button>
            <button
              onClick={() => setIsAdminMode(true)}
              className={`px-8 py-2 rounded-md text-sm font-bold transition-all ${isAdminMode ? 'bg-[#0F1522] text-white shadow-lg border border-white/5' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                Employee ID
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 group-focus-within:text-blue-400 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </span>
                <input
                  type="text"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  placeholder="Enter your ID"
                  className="w-full bg-[#0F1522] border border-white/5 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                Password
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 group-focus-within:text-blue-400 transition-colors">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-[#0F1522] border border-white/5 rounded-lg py-3 pl-10 pr-10 text-white placeholder-gray-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsForgotOpen(true)}
                className="text-xs font-bold text-blue-400 hover:text-blue-300"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-[10px] text-gray-600">
              By signing in, you agree to the <span className="text-blue-400 cursor-pointer hover:underline">Terms of Service</span> and <span className="text-blue-400 cursor-pointer hover:underline">Privacy Policy</span>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal - Dark Themed */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111611] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0a0f0a]">
              <h3 className="font-bold text-white">Reset Password</h3>
              <button onClick={() => { setIsForgotOpen(false); setForgotStep('VERIFY'); }} className="text-gray-500 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={forgotStep === 'VERIFY' ? handleVerifyReset : handleResetPassword} className="p-6 space-y-4">
              {forgotStep === 'VERIFY' ? (
                <>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Employee ID"
                      value={resetData.emp_id}
                      onChange={e => setResetData({ ...resetData, emp_id: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500/50 outline-none"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Registered Email"
                      value={resetData.email}
                      onChange={e => setResetData({ ...resetData, email: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500/50 outline-none"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Registered Mobile (Optional)"
                      value={resetData.mobile}
                      onChange={e => setResetData({ ...resetData, mobile: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500/50 outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs mb-4">
                    Identity verified. Set your new password.
                  </div>
                  <input
                    type="password"
                    placeholder="New Password"
                    value={resetData.new_pass}
                    onChange={e => setResetData({ ...resetData, new_pass: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500/50 outline-none"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={resetData.confirm_pass}
                    onChange={e => setResetData({ ...resetData, confirm_pass: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-blue-500/50 outline-none"
                    required
                  />
                </>
              )}

              {resetError && <p className="text-red-400 text-xs">{resetError}</p>}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {resetLoading ? 'Processing...' : (forgotStep === 'VERIFY' ? 'Verify Identity' : 'Reset Password')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Force Login Confirmation Modal */}
      {showForceLogin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111611] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 text-center">
              <div className="size-14 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20">
                <span className="material-symbols-outlined text-3xl text-yellow-500">warning</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Active Session Detected</h3>
              <p className="text-sm text-gray-400">
                You are already logged in on another device. Do you want to force login here? This will log you out from the other device.
              </p>
            </div>

            <div className="p-4 border-t border-white/5 bg-black/20 flex gap-3">
              <button
                onClick={handleForceLoginCancel}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all font-bold text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                onClick={handleForceLoginConfirm}
                className="flex-1 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/20 transition-all font-bold text-xs uppercase tracking-wider"
              >
                Force Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
