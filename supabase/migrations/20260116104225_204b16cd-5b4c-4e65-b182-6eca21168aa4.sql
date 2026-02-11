-- ============================================
-- FEATURE 2: Notifications table
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('filing_submitted', 'payment_verified', 'payment_rejected', 'tax_rule_updated', 'filing_overdue', 'payment_due')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_own" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read) WHERE read = false;

-- ============================================
-- FEATURE 5: Crypto Transactions table
-- ============================================
CREATE TABLE IF NOT EXISTS public.crypto_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'trade', 'mining', 'staking', 'airdrop', 'gift')),
  asset_symbol TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  price_ngn_kobo TEXT NOT NULL,
  total_ngn_kobo TEXT NOT NULL,
  transaction_date TIMESTAMPTZ NOT NULL,
  exchange_platform TEXT,
  notes TEXT,
  cost_basis_kobo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.crypto_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crypto_transactions_select_own" ON public.crypto_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "crypto_transactions_insert_own" ON public.crypto_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "crypto_transactions_update_own" ON public.crypto_transactions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_crypto_transactions_user_date ON public.crypto_transactions(user_id, transaction_date DESC);

-- ============================================
-- FEATURE 6: Foreign Income table
-- ============================================
CREATE TABLE IF NOT EXISTS public.foreign_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_country TEXT NOT NULL,
  income_type TEXT NOT NULL,
  amount_foreign_currency NUMERIC NOT NULL,
  currency_code TEXT NOT NULL,
  amount_ngn_kobo TEXT NOT NULL,
  tax_paid_foreign_kobo TEXT,
  treaty_applicable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.foreign_income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "foreign_income_select_own" ON public.foreign_income
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "foreign_income_insert_own" ON public.foreign_income
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "foreign_income_update_own" ON public.foreign_income
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_foreign_income_user ON public.foreign_income(user_id, created_at DESC);

-- ============================================
-- FEATURE 8: AI Explanations table
-- ============================================
CREATE TABLE IF NOT EXISTS public.explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "explanations_select_own" ON public.explanations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "explanations_insert_own" ON public.explanations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_explanations_user ON public.explanations(user_id, created_at DESC);

-- ============================================
-- FEATURE 9: Bank Connections table
-- ============================================
CREATE TABLE IF NOT EXISTS public.bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  account_id TEXT NOT NULL,
  account_name TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync TIMESTAMPTZ,
  status TEXT DEFAULT 'active'
);

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_connections_select_own" ON public.bank_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bank_connections_insert_own" ON public.bank_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bank_connections_update_own" ON public.bank_connections
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bank_connections_delete_own" ON public.bank_connections
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_bank_connections_user ON public.bank_connections(user_id);

-- ============================================
-- FEATURE 10: NRS Integration columns on filings
-- ============================================
ALTER TABLE public.filings ADD COLUMN IF NOT EXISTS nrs_reference TEXT;
ALTER TABLE public.filings ADD COLUMN IF NOT EXISTS nrs_submitted_at TIMESTAMPTZ;
ALTER TABLE public.filings ADD COLUMN IF NOT EXISTS nrs_status TEXT;

-- ============================================
-- FEATURE 11: Payment Gateway columns on payments
-- ============================================
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_reference TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS gateway_response JSONB;

-- ============================================
-- FEATURE 12: Parsed Emails table
-- ============================================
CREATE TABLE IF NOT EXISTS public.parsed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_subject TEXT,
  parsed_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.parsed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parsed_emails_select_own" ON public.parsed_emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "parsed_emails_insert_own" ON public.parsed_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_parsed_emails_user ON public.parsed_emails(user_id, created_at DESC);

-- ============================================
-- FEATURE 13: Incomes table
-- ============================================
CREATE TABLE IF NOT EXISTS public.incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source TEXT NOT NULL,
  amount_kobo TEXT NOT NULL,
  date DATE NOT NULL,
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incomes_select_own" ON public.incomes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "incomes_insert_own" ON public.incomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "incomes_update_own" ON public.incomes
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_incomes_user_date ON public.incomes(user_id, date DESC);

-- ============================================
-- FEATURE 13: Expenses table
-- ============================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount_kobo TEXT NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  deductible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select_own" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "expenses_insert_own" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses_update_own" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_expenses_user_date ON public.expenses(user_id, date DESC);

-- ============================================
-- FEATURE 14: Rule-to-Law Mapping columns on tax_rules
-- ============================================
ALTER TABLE public.tax_rules ADD COLUMN IF NOT EXISTS legal_reference TEXT;
ALTER TABLE public.tax_rules ADD COLUMN IF NOT EXISTS nta_section TEXT;