import { AppState } from './types';

export const ROUTES: Record<AppState, string> = {
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
    USER_MANAGEMENT: '/users',
    USER_PERMISSION_MANAGEMENT: '/permissions',
    PRODUCT_MASTER: '/products',
    DISTRIBUTOR_CONTROL: '/distributors',
    PENDING_ORDERS: '/orders/pending',
    ORDER_HISTORY: '/orders/history',
    PARTNER_NETWORK: '/partners',
    BALANCE_CHECK: '/balance',
    SETTINGS: '/settings',
    PROFILE: '/profile',
    ADD_DEMAND: '/demand/add',
    SALES_HIERARCHY: '/sales-hierarchy',
    UPLOAD_BALANCE: '/balance/upload',
    LOGISTICS_UTILITY: '/logistics',
    MICRO_MASTERS: '/masters',
    REPORTS: '/reports'
};

export const getRouteByPage = (page: AppState): string => ROUTES[page] || '/dashboard';

export const getPageByRoute = (path: string): AppState => {
    const entry = Object.entries(ROUTES).find(([_, route]) => route === path);
    return entry ? (entry[0] as AppState) : 'DASHBOARD'; // Default to Dashboard for unknown routes
};
