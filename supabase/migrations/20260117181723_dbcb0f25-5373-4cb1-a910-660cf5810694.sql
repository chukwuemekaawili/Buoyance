-- Add admin role for the admin user
INSERT INTO public.user_roles (user_id, role) 
VALUES ('91ab8c52-3783-4180-b6fa-f01ef2ea038d', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Also update the profile
UPDATE public.profiles 
SET display_name = 'Buoyance Admin', user_type = 'admin' 
WHERE id = '91ab8c52-3783-4180-b6fa-f01ef2ea038d';