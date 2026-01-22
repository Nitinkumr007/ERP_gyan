
export type AppState = 'LOGIN' | 'DASHBOARD' | 'USER_MANAGEMENT' | 'PRODUCT_MASTER' | 'DISTRIBUTOR_CONTROL' | 'PENDING_ORDERS' | 'ORDER_HISTORY' | 'PARTNER_NETWORK' | 'BALANCE_CHECK' | 'SETTINGS' | 'PROFILE' | 'ADD_DEMAND' | 'SALES_HIERARCHY' | 'UPLOAD_BALANCE' | 'REPORTS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  region: string;
  status: 'Active' | 'Pending' | 'Inactive';
  avatar?: string;
}

// Based on public.user_access_master
export interface UserAccessMaster {
  user_id: number;
  user_name: string;
  emp_id: string;
  emp_designation?: string;
  role: string;
  access_type?: string;
  password_hash: string;
  email?: string;
  mobile?: string;
  can_view?: boolean;
  can_add?: boolean;
  can_modify?: boolean;
  can_delete?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  reporting_manager_id?: string | null;
}

// Based on public.product_master
export interface ProductMaster {
  product_id: number;
  product_name: string;
  category: string;
  weight?: number;
  unit?: string;
  price: number;
  gst_percentage?: number;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// Keeping these for legacy if needed, or remove if unused
export interface Distributor {
  dbId: number;
  dbName: string;
  distributorName: string;
  region: string;
  district: string;
  plant: string;
  status: string;
  rsm?: string;
  asm?: string;
  executive?: string;
  address?: string;
}

export interface DemandDispatchMaster {
  demand_id: number;
  demand_date: string | null;
  demand_time: string | null;
  order_id: number;
  db_id: number | null;
  db_name: string | null;
  rsm_id: number | null;
  rsm_name: string | null;
  asm_id: number | null;
  asm_name: string | null;
  district: string | null;
  location: string | null;
  plant_name: string | null;
  closing_balance: number | null;
  payment_status: string | null;
  dispatch_priority: string | null;
  transport: string | null;
  bill_date: string | null;
  vehicle_number: string | null;
  transporter_name: string | null;
  supreme_50kg: number | null;
  supreme_25kg: number | null;
  gold_pro_50kg: number | null;
  gold_pro_25kg: number | null;
  doodh_plus_50kg: number | null;
  doodh_plus_25kg: number | null;
  bhains_special_50kg: number | null;
  diamond_pro_50kg: number | null;
  transition_feed_25kg: number | null;
  calf_starter_5kg: number | null;
  cmm_red_10kg: number | null;
  cmm_premium_10kg: number | null;
  milk_maxima_20ltrs: number | null;
  milk_maxima_10ltrs: number | null;
  milk_maxima_5x3ltrs: number | null;
  milk_maxima_1x16ltrs: number | null;
  milk_maxima_5x2ltrs: number | null;
  batisa_gold_20gms: number | null;
  batisa_gold_100gms: number | null;
  masti_shield_20x300gms: number | null;
  snf_power_plus_20x500gms: number | null;
  toxin_binder_20x500gms: number | null;
  utriclean_1x10_bottle: number | null;
  total_in_mt: number | null;
  created_at: string | null;
}
