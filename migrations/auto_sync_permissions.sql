-- 1. Backfill existing users who don't have a permissions entry yet
INSERT INTO public.user_menu_permissions (emp_id)
SELECT emp_id 
FROM public.user_access_master 
WHERE emp_id NOT IN (SELECT emp_id FROM public.user_menu_permissions);

-- 2. Create a function to handle new user insertion
CREATE OR REPLACE FUNCTION public.handle_new_user_permission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_menu_permissions (emp_id)
  VALUES (NEW.emp_id)
  ON CONFLICT (emp_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS on_user_created ON public.user_access_master;
CREATE TRIGGER on_user_created
AFTER INSERT ON public.user_access_master
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_permission();
