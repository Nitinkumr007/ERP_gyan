-- Create table for granular user menu permissions
create table public.user_menu_permissions (
  emp_id text not null references public.user_access_master(emp_id),
  
  -- Masters
  access_product_master boolean default false,
  access_user_management boolean default false,
  access_distributor_control boolean default false,
  access_sales_hierarchy boolean default false,
  access_partner_network boolean default false,
  access_system_settings boolean default false,
  
  -- Reports
  access_dashboard boolean default true, -- Usually everyone sees dashboard
  access_reports_center boolean default false,
  access_order_history boolean default false,
  access_dbr_balance boolean default false,
  access_system_demands boolean default false,
  
  -- Demand User
  access_new_demand boolean default false,
  access_upload_balance boolean default false,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  primary key (emp_id)
);

-- Enable RLS (Optional but recommended)
alter table public.user_menu_permissions enable row level security;

-- Policy: Admins can do everything
-- (For simplicity in this quick setup, we might skip complex RLS policies and rely on application logic + admin role checks in Supabase if RLS is off, or assume service_role/admin user)
-- For now allowing public read/write if you want, or better:
create policy "Enable read access for all users" on public.user_menu_permissions for select using (true);
create policy "Enable insert/update for admins" on public.user_menu_permissions for all using (true); -- Simplified for now

