
import React, { useState } from 'react';
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
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { AppState, UserAccessMaster } from './types';

// Add USER_PERMISSION_MANAGEMENT to AppState type locally if it wasn't updated in types.ts (Wait, types.ts wasn't updated with the AppState enum change yet! I need to do that too)
// Actually I missed updating AppState in types.ts in previous step. 
// I will just use string casting or assume it's there? No, I should update types.ts properly.
// But for this file I will add the case.


const App: React.FC = () => {
  const [activePage, setActivePage] = useState<AppState>('LOGIN');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccessMaster | null>(null);

  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  React.useEffect(() => {
    // Apply theme to html element
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

  const handleLogin = (user: UserAccessMaster) => {
    setCurrentUser(user);
    const adminMode = (user.role === 'Admin' || user.emp_designation?.toLowerCase().includes('admin')) ?? false;
    setIsAdmin(adminMode);
    setActivePage('DASHBOARD');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setActivePage('LOGIN');
  };


  if (activePage === 'LOGIN') {
    return <Login onLogin={handleLogin} toggleTheme={toggleTheme} currentTheme={theme} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'DASHBOARD': return <Dashboard isAdmin={isAdmin} />;
      case 'USER_MANAGEMENT': return <UserManagement onNavigate={setActivePage} />;
      case 'USER_PERMISSION_MANAGEMENT': return <UserPermissionManagement onNavigate={setActivePage} />;
      case 'PRODUCT_MASTER': return <ProductMaster />;
      case 'DISTRIBUTOR_CONTROL': return <DistributorMaster />;
      case 'PENDING_ORDERS': return <PendingOrders onNavigate={setActivePage} />;
      case 'ORDER_HISTORY': return <OrderHistory />;
      case 'PARTNER_NETWORK': return <PartnerNetwork />;
      case 'BALANCE_CHECK': return <BalanceCheck />;
      case 'SETTINGS': return <Settings toggleTheme={toggleTheme} currentTheme={theme} />;
      case 'PROFILE': return <UserProfile currentUser={currentUser} />;
      case 'ADD_DEMAND': return <AddDemand onNavigate={setActivePage} />;
      case 'SALES_HIERARCHY': return <SalesHierarchy />;
      case 'UPLOAD_BALANCE': return <UploadBalance />;
      case 'REPORTS': return <Reports currentUser={currentUser} />;
      default: return <Dashboard isAdmin={isAdmin} />;
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden relative font-sans transition-colors duration-300">
      {/* Decorative Blurs - Only visible in Dark Mode usually, or adjusted opacity */}
      <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[var(--color-primary)] opacity-10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-20%] right-[-5%] w-[800px] h-[800px] bg-[var(--color-secondary)] opacity-10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        currentUser={currentUser}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <Header activePage={activePage} isAdmin={isAdmin} />
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default App;
