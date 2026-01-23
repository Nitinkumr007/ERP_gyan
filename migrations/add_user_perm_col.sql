-- Add access_user_permissions to user_menu_permissions table
ALTER TABLE public.user_menu_permissions 
ADD COLUMN IF NOT EXISTS access_user_permissions boolean DEFAULT true;

-- Ensure it is enabled for all existing users
UPDATE public.user_menu_permissions 
SET access_user_permissions = true 
WHERE access_user_permissions IS NOT true;
