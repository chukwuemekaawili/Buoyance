-- =================================================================================
-- PRE-SPRINT: WORKSPACE BACKFILL FOR ORPHANED USERS
-- Assigns a default 'Individual' workspace to any user in auth.users lacking one.
-- =================================================================================

DO $$
DECLARE
    user_record RECORD;
    new_org_id UUID;
    org_name TEXT;
BEGIN
    FOR user_record IN 
        SELECT id, email FROM auth.users 
        WHERE NOT EXISTS (
            SELECT 1 FROM public.workspace_users WHERE user_id = auth.users.id
        )
    LOOP
        -- Generate a new UUID for the organization
        new_org_id := gen_random_uuid();
        
        -- Create a clean org name from the email (split before '@')
        org_name := COALESCE(split_part(user_record.email, '@', 1) || '''s Workspace', 'Personal Workspace');
        
        -- Insert organization
        INSERT INTO public.organizations (id, name, entity_type)
        VALUES (new_org_id, org_name, 'Individual');
        
        -- Link user to workspace as owner
        INSERT INTO public.workspace_users (workspace_id, user_id, role)
        VALUES (new_org_id, user_record.id, 'Owner');
    END LOOP;
END;
$$;
