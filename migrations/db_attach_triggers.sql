-- =========================================================
-- LINKING AUDIT LOG TO MASTER TABLES
-- Run this script to start tracking changes in your system.
-- =========================================================

-- 1. Distributor Master
DROP TRIGGER IF EXISTS audit_distributor_master ON "Distributor_Master";
CREATE TRIGGER audit_distributor_master
AFTER INSERT OR UPDATE OR DELETE ON "Distributor_Master"
FOR EACH ROW EXECUTE FUNCTION log_any_change();

-- 2. User Access Master (Permissions & Users)
DROP TRIGGER IF EXISTS audit_user_access ON public.user_access_master;
CREATE TRIGGER audit_user_access
AFTER INSERT OR UPDATE OR DELETE ON public.user_access_master
FOR EACH ROW EXECUTE FUNCTION log_any_change();

-- 3. Product Master
DROP TRIGGER IF EXISTS audit_product_master ON public.product_master;
CREATE TRIGGER audit_product_master
AFTER INSERT OR UPDATE OR DELETE ON public.product_master
FOR EACH ROW EXECUTE FUNCTION log_any_change();

-- 4. Demand Dispatch Master (Orders)
DROP TRIGGER IF EXISTS audit_demand_dispatch ON public.demand_dispatch_master;
CREATE TRIGGER audit_demand_dispatch
AFTER INSERT OR UPDATE OR DELETE ON public.demand_dispatch_master
FOR EACH ROW EXECUTE FUNCTION log_any_change();

-- 5. User Permisisons (if separate, usually part of user_access_master but good to check)
-- (Assuming permissions are columns in user_access_master based on types.ts)

-- Verification:
-- After running this, any change to these tables will appear in 'system_transitional_log'.
