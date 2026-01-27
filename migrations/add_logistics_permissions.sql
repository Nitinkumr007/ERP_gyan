-- Add new permissions to user_menu_permissions table

ALTER TABLE public.user_menu_permissions 
ADD COLUMN IF NOT EXISTS access_logistics_utility BOOLEAN DEFAULT FALSE;

ALTER TABLE public.user_menu_permissions 
ADD COLUMN IF NOT EXISTS access_micro_masters BOOLEAN DEFAULT FALSE;

-- Optional: Update existing admin users to have these permissions by default
-- UPDATE public.user_menu_permissions 
-- SET access_logistics_utility = TRUE, access_micro_masters = TRUE 
-- WHERE emp_id IN (SELECT emp_id FROM public.user_access_master WHERE role = 'Admin');
