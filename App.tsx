import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES, getRouteByPage, getPageByRoute } from './routes';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import UserPermissionManagement from './pages/UserPermissionManagement';
import ProductMaster from './pages/ProductMaster';
import DistributorMaster from './pages/DistributorMaster';
import PendingOrders from './pages/PendingOrders';
import OrderHistory from './pages/OrderHistory';
import PartnerNetwork from './pages/PartnerNetwork';
import BalanceCheck from './pages/BalanceCheck';
import Settings from './pages/Settings';
import UserProfile from './pages/UserProfile';
import AddDemand from './pages/AddDemand';
import SalesHierarchy from './pages/SalesHierarchy';
import UploadBalance from './pages/UploadBalance';
import Reports from './pages/Reports';
import LogisticsUtility from './pages/LogisticsUtility';
import MicroMasters from './pages/MicroMasters';
import Sidebar from './components/Sidebar';
import UnifiedHeader, { TabItem } from './components/UnifiedHeader';
import { AppState, UserAccessMaster } from './types';

import { supabase } from './supabaseClient';

const AppContent: React.FC = () => {
  // Router Hooks
  const location = useLocation();
  const navigate = useNavigate();

  // Tab State: { id, page }
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Derived Active Page
  const getCurrentPage = (): AppState => {
    if (!activeTabId || tabs.length === 0) return 'LOGIN';
    const currentTab = tabs.find(t => t.id === activeTabId);
    return currentTab ? currentTab.page : 'LOGIN';
  };
  const activePage = getCurrentPage();

  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccessMaster | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Constants
  const SESSION_TIMEOUT_MS = 50 * 60 * 1000; // 50 Minutes
  const DB_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 Minutes
  const STORAGE_WRITE_THROTTLE_MS = 5000; // 5 Seconds

  // URL SYNC: URL -> State (Handle Deep Links / Back Button)
  useEffect(() => {
    // 1. Try Restoring Session Logic (Only runs once on mount)
    if (!currentUser) {
      const storedUser = localStorage.getItem('demand_user');
      const storedSessionId = localStorage.getItem('demand_session_id');
      const lastActiveStr = localStorage.getItem('demand_last_active');

      if (storedUser && storedSessionId && lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        const now = Date.now();

        if (now - lastActive < SESSION_TIMEOUT_MS) {

          try {
            const userObj = JSON.parse(storedUser);
            setCurrentUser(userObj);
            setCurrentSessionId(storedSessionId);

            const adminMode = (userObj.role === 'Admin' || userObj.emp_designation?.toLowerCase().includes('admin')) ?? false;
            setIsAdmin(adminMode);

            // Initialize Tab
            const targetPage = getPageByRoute(location.pathname);
            if (tabs.length === 0 && targetPage !== 'LOGIN') {
              const initId = uuidv4();
              setTabs([{ id: initId, page: targetPage }]);
              setActiveTabId(initId);
            }
          } catch (e) {
            console.error("Failed to parse stored user", e);
            handleLogout(true);
          }
        } else {
          console.warn("Session expired during restore.");
          handleLogout(true);
        }
      }
      setIsRestoringSession(false);
    }
  }, []);

  // 2. URL Sync Logic
  useEffect(() => {
    if (isRestoringSession) return;

    const targetPage = getPageByRoute(location.pathname);
    if (targetPage === 'LOGIN' && currentUser) return;
    if (targetPage !== 'LOGIN' && !currentUser) return;

    if (targetPage !== activePage) {
      if (activeTabId) {
        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, page: targetPage } : t));
      } else if (tabs.length === 0 && currentUser) {
        const initId = uuidv4();
        setTabs([{ id: initId, page: targetPage }]);
        setActiveTabId(initId);
      }
    }
  }, [location.pathname, currentUser, isRestoringSession]);

  // URL SYNC: State -> URL
  useEffect(() => {
    if (activePage === 'LOGIN') {
      if (location.pathname !== '/login') navigate('/login');
      return;
    }
    const path = getRouteByPage(activePage);
    if (location.pathname !== path) {
      navigate(path);
    }
  }, [activePage]);


  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = (user: UserAccessMaster, sessionId: string) => {
    setCurrentUser(user);
    setCurrentSessionId(sessionId);
    const adminMode = (user.role === 'Admin' || user.emp_designation?.toLowerCase().includes('admin')) ?? false;
    setIsAdmin(adminMode);

    localStorage.setItem('demand_user', JSON.stringify(user));
    localStorage.setItem('demand_session_id', sessionId);
    localStorage.setItem('demand_last_active', Date.now().toString());

    const targetPage = getPageByRoute(location.pathname);
    const initialPage = targetPage !== 'LOGIN' ? targetPage : 'DASHBOARD';

    const initId = uuidv4();
    setTabs([{ id: initId, page: initialPage }]);
    setActiveTabId(initId);

    navigate(getRouteByPage(initialPage));
  };

  // Session Monitoring & Activity Tracking
  React.useEffect(() => {
    if (!currentSessionId) return;

    const checkSession = async () => {
      const lastActiveStr = localStorage.getItem('demand_last_active');
      if (lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        const now = Date.now();
        if (now - lastActive > SESSION_TIMEOUT_MS) {
          console.warn("Session timed out.");
          handleLogout(true);
          return;
        }
      }

      const { data, error } = await supabase
        .from('user_sessions')
        .select('is_active')
        .eq('session_id', currentSessionId)
        .single();

      if (error || !data || !data.is_active) {
        handleLogout(true);
      }
    };

    // Throttled Activity Update
    const updateActivity = () => {
      const now = Date.now();
      const lastWrite = parseInt(localStorage.getItem('demand_last_write') || '0', 10);

      if (now - lastWrite > STORAGE_WRITE_THROTTLE_MS) {
        localStorage.setItem('demand_last_active', now.toString());
        localStorage.setItem('demand_last_write', now.toString());

        const lastDbSync = parseInt(localStorage.getItem('demand_last_db_sync') || '0', 10);
        if (now - lastDbSync > DB_SYNC_INTERVAL_MS) {
          supabase
            .from('user_sessions')
            .update({ last_activity: new Date().toISOString() })
            .eq('session_id', currentSessionId)
            .then(() => localStorage.setItem('demand_last_db_sync', now.toString()));
        }
      }
    };

    const interval = setInterval(checkSession, 30000);

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
    };
  }, [currentSessionId]);

  const handleLogout = async (isAutoLogout: boolean = false) => {
    localStorage.removeItem('demand_user');
    localStorage.removeItem('demand_session_id');
    localStorage.removeItem('demand_last_active');
    localStorage.removeItem('demand_last_db_sync');
    localStorage.removeItem('demand_last_write');

    if (currentSessionId) {
      try {
        await supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('session_id', currentSessionId);

        await supabase
          .from('user_login_log')
          .update({
            logout_time: new Date().toISOString(),
            login_status: isAutoLogout ? 'EXPIRED/FORCED' : 'LOGOUT'
          })
          .eq('session_id', currentSessionId);
      } catch (err) { console.error(err); }
    }

    if (isAutoLogout) alert("Session expired. Please login again.");

    setCurrentUser(null);
    setCurrentSessionId(null);
    setIsAdmin(false);
    setTabs([]);
    setActiveTabId(null);
    navigate('/login');
  };

  if (isRestoringSession) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0f172a] text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Navigation Logic
  const handleNavigate = (page: AppState) => {
    if (page === 'LOGIN') return;

    if (!activeTabId && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
      setTabs(prev => prev.map((t, i) => i === 0 ? { ...t, page } : t));
    } else if (activeTabId) {
      setTabs(prev => prev.map(tab =>
        tab.id === activeTabId ? { ...tab, page } : tab
      ));
    } else if (tabs.length === 0) {
      const newId = uuidv4();
      setTabs([{ id: newId, page }]);
      setActiveTabId(newId);
    }

    setIsMobileMenuOpen(false);
  };

  const handleNewTab = () => {
    const newId = uuidv4();
    setTabs(prev => [...prev, { id: newId, page: 'DASHBOARD' }]);
    setActiveTabId(newId);
  };

  const handleTabClick = (id: string) => {
    setActiveTabId(id);
  };

  const handleTabClose = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);

    if (id === activeTabId) {
      if (newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      } else {
        const backupId = uuidv4();
        setTabs([{ id: backupId, page: 'DASHBOARD' }]);
        setActiveTabId(backupId);
      }
    }
  };

  const handleTabRefresh = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(prev => prev.map(t =>
      t.id === id ? { ...t, version: (t.version || 0) + 1 } : t
    ));
  };


  if (!currentSessionId || activePage === 'LOGIN') {
    return <Login onLogin={handleLogin} toggleTheme={toggleTheme} currentTheme={theme} />;
  }

  const renderPageContent = (page: AppState) => {
    switch (page) {
      case 'DASHBOARD': return <Dashboard isAdmin={isAdmin} />;
      case 'USER_MANAGEMENT': return <UserManagement onNavigate={handleNavigate} />;
      case 'USER_PERMISSION_MANAGEMENT': return <UserPermissionManagement onNavigate={handleNavigate} />;
      case 'PRODUCT_MASTER': return <ProductMaster />;
      case 'DISTRIBUTOR_CONTROL': return <DistributorMaster />;
      case 'PENDING_ORDERS': return <PendingOrders onNavigate={handleNavigate} />;
      case 'ORDER_HISTORY': return <OrderHistory />;
      case 'PARTNER_NETWORK': return <PartnerNetwork />;
      case 'BALANCE_CHECK': return <BalanceCheck />;
      case 'SETTINGS': return <Settings toggleTheme={toggleTheme} currentTheme={theme} />;
      case 'PROFILE': return <UserProfile currentUser={currentUser} />;
      case 'ADD_DEMAND': return <AddDemand onNavigate={handleNavigate} />;
      case 'SALES_HIERARCHY': return <SalesHierarchy />;
      case 'UPLOAD_BALANCE': return <UploadBalance />;
      case 'LOGISTICS_UTILITY': return <LogisticsUtility currentUser={currentUser} />;
      case 'MICRO_MASTERS': return <MicroMasters />;
      case 'REPORTS': return <Reports currentUser={currentUser} />;
      default: return <Dashboard isAdmin={isAdmin} />;
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden relative font-sans transition-colors duration-300">
      {/* Decorative Blurs */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[var(--color-primary)] opacity-10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-20%] right-[-5%] w-[800px] h-[800px] bg-[var(--color-secondary)] opacity-10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogout={() => handleLogout(false)}
        isAdmin={isAdmin}
        currentUser={currentUser}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 w-full">
        <UnifiedHeader
          activeTabId={activeTabId || ''}
          tabs={tabs}
          onTabClick={handleTabClick}
          onTabClose={handleTabClose}
          onTabRefresh={handleTabRefresh}
          onNewTab={handleNewTab}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          onNavigate={handleNavigate}
          isAdmin={isAdmin}
        />

        <div className="flex-1 relative overflow-hidden">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`absolute inset-0 overflow-y-auto p-4 md:p-8 custom-scrollbar transition-opacity duration-200 
                 ${tab.id === activeTabId ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}
               `}
              style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
            >
              <div key={`${tab.page}-${tab.version || 0}`} className="h-full">
                {renderPageContent(tab.page)}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
