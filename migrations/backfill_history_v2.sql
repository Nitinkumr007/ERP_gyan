-- FIXED Backfill script (Safe Mode)
-- Only inserts history for ASMs that actually exist in user_access_master
-- This avoids the "Key not present" error for orphan IDs like 600132

INSERT INTO public.territory_history (db_id, asm_id, asm_name, assigned_by, start_date, reason)
SELECT DISTINCT ON (dm."DB ID")
  dm."DB ID",
  u.user_id, -- Use the confirmed valid user_id from the join
  dm."ASM",
  'System Migration',
  NOW(),
  'Initial Data Load'
FROM public."Distributor_Master" dm
-- INNER JOIN forces the user to exist in the master table
JOIN public.user_access_master u 
  ON (dm."ASM ID" = u.user_id)  -- Link by ID if valid
  OR (dm."ASM" = u.user_name)   -- Fallback link by Name if ID is missing/mismatch
WHERE dm."ASM" IS NOT NULL;
