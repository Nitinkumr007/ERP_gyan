-- Backfill script to populate territory_history from existing Distributor_Master data

INSERT INTO public.territory_history (db_id, asm_id, asm_name, assigned_by, start_date, reason)
SELECT
  dm."DB ID",
  -- Prioritize existing ID, otherwise try to find it by name from user_access_master
  COALESCE(dm."ASM ID", u.user_id) as asm_id,
  dm."ASM",
  'System Migration' as assigned_by,
  NOW() as start_date,
  'Initial Data Load' as reason
FROM public."Distributor_Master" dm
LEFT JOIN public.user_access_master u ON dm."ASM" = u.user_name
WHERE 
  dm."ASM" IS NOT NULL 
  AND (dm."ASM ID" IS NOT NULL OR u.user_id IS NOT NULL);

-- Verification: Check how many rows were inserted
-- select count(*) from public.territory_history;
