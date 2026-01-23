-- Add granular report permissions
alter table public.user_menu_permissions 
add column if not exists access_report_demand_log boolean default false,
add column if not exists access_report_pending_orders boolean default false,
add column if not exists access_report_plant_summary boolean default false,
add column if not exists access_report_distributor_db boolean default false,
add column if not exists access_report_high_balances boolean default false,
add column if not exists access_report_product_catalog boolean default false,
add column if not exists access_report_user_roles boolean default false;
