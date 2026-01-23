-- Add closing_date to Distributor_Master
alter table public."Distributor_Master" 
add column if not exists "closing_date" timestamp with time zone null;
