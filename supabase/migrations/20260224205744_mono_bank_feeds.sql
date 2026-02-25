-- Enable secure pgcrypto if not already enabled (for token hashing if required)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Bank Connections
-- We map bank_connections to organizations (workspaces) instead of just the user
-- to allow the accountant and team members to utilize the bank feed mapping.
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add Mono specific fields to bank_connections
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS account_number VARCHAR(20);
ALTER TABLE public.bank_connections ADD COLUMN IF NOT EXISTS balance_kobo BIGINT;

-- Normalize existing bank_connections RLS policies to use workspace_id
DROP POLICY IF EXISTS "bank_connections_select" ON public.bank_connections;
DROP POLICY IF EXISTS "bank_connections_insert" ON public.bank_connections;
DROP POLICY IF EXISTS "bank_connections_update" ON public.bank_connections;
DROP POLICY IF EXISTS "bank_connections_delete" ON public.bank_connections;

-- RLS: Only workspace members can view
CREATE POLICY "View bank connections for own workspace"
ON public.bank_connections FOR SELECT
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid()
));

-- RLS: Only Admins/Owners can link banks
CREATE POLICY "Manage bank connections"
ON public.bank_connections FOR ALL
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin')
));

-- Imported Bank Transactions
CREATE TABLE IF NOT EXISTS public.imported_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.imported_transactions
  ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS bank_connection_id UUID REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS raw_description TEXT,
  ADD COLUMN IF NOT EXISTS amount_kobo BIGINT,
  ADD COLUMN IF NOT EXISTS transaction_date DATE,
  ADD COLUMN IF NOT EXISTS bank_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS suggested_category TEXT,
  ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
  ADD COLUMN IF NOT EXISTS reconciled_ledger_type TEXT CHECK (reconciled_ledger_type IN ('income', 'expense')),
  ADD COLUMN IF NOT EXISTS reconciled_ledger_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- RLS for imported transactions
ALTER TABLE public.imported_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View imported transactions for own workspace"
ON public.imported_transactions FOR SELECT
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid()
));

CREATE POLICY "Manage imported transactions"
ON public.imported_transactions FOR ALL
USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_users WHERE user_id = auth.uid() AND role IN ('Owner', 'Admin', 'Member', 'External_Accountant')
));
