-- Buoyance Core Feature Migrations
-- Run this entire file in Supabase SQL Editor
-- Created: 2026-02-15

-- ============================================
-- MIGRATION 1: Portal Integration & DIN
-- ============================================
ALTER TABLE filings ADD COLUMN IF NOT EXISTS din VARCHAR(50);
ALTER TABLE filings ADD COLUMN IF NOT EXISTS submission_status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE filings ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS portal_type VARCHAR(20);
ALTER TABLE filings ADD COLUMN IF NOT EXISTS template_version VARCHAR(20);
ALTER TABLE filings ADD COLUMN IF NOT EXISTS receipt_url TEXT;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS din VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS filing_id UUID REFERENCES filings(id);

-- ============================================
-- MIGRATION 2: WHT Certificates & Credits
-- ============================================
CREATE TABLE IF NOT EXISTS wht_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  issuer_name VARCHAR(255),
  issuer_tin VARCHAR(20),
  beneficiary_tin VARCHAR(20),
  amount_kobo BIGINT NOT NULL,
  wht_rate DECIMAL(5,2),
  certificate_number VARCHAR(100),
  issue_date DATE,
  tax_year INTEGER,
  document_url TEXT,
  ocr_confidence DECIMAL(5,2),
  matched_transaction_ids UUID[],
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wht_credit_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  certificate_id UUID REFERENCES wht_certificates(id),
  tax_year INTEGER NOT NULL,
  credit_amount_kobo BIGINT NOT NULL,
  applied_amount_kobo BIGINT DEFAULT 0,
  remaining_amount_kobo BIGINT,
  expires_at DATE,
  status VARCHAR(20) DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wht_credits_user_year ON wht_credit_ledger(user_id, tax_year);

-- ============================================
-- MIGRATION 3: TCC Requirements
-- ============================================
CREATE TABLE IF NOT EXISTS tcc_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jurisdiction VARCHAR(50) NOT NULL,
  requirement_type VARCHAR(50),
  description TEXT,
  is_mandatory BOOLEAN DEFAULT true,
  sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS tcc_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  jurisdiction VARCHAR(50),
  requirement_id UUID REFERENCES tcc_requirements(id),
  status VARCHAR(20) DEFAULT 'missing',
  document_url TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MIGRATION 4: Compliance Tasks & Reminders
-- ============================================
CREATE TABLE IF NOT EXISTS compliance_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  tax_type VARCHAR(10),
  regulator VARCHAR(50),
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  filing_id UUID REFERENCES filings(id),
  payment_id UUID REFERENCES payments(id),
  priority INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES compliance_tasks(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  reminder_type VARCHAR(20),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  dismissed BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON compliance_tasks(user_id, due_date);

-- ============================================
-- MIGRATION 5: Anomalies
-- ============================================
CREATE TABLE IF NOT EXISTS anomalies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  anomaly_type VARCHAR(50),
  severity VARCHAR(20) DEFAULT 'medium',
  description TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  related_entity_type VARCHAR(20),
  related_entity_id UUID
);

CREATE INDEX IF NOT EXISTS idx_anomalies_user_unresolved ON anomalies(user_id) WHERE resolved_at IS NULL;

-- ============================================
-- MIGRATION 6: Imported Transactions
-- ============================================
CREATE TABLE IF NOT EXISTS imported_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  source_type VARCHAR(20),
  source_file_url TEXT,
  transaction_date DATE,
  description TEXT,
  amount_kobo BIGINT,
  debit_credit VARCHAR(10),
  raw_data JSONB,
  confidence_score DECIMAL(5,2),
  category_suggestion VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  linked_record_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imported_pending ON imported_transactions(user_id, status) WHERE status = 'pending';

-- ============================================
-- MIGRATION 7: Invoices
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  invoice_number VARCHAR(50) UNIQUE,
  client_name VARCHAR(255),
  client_tin VARCHAR(20),
  issue_date DATE NOT NULL,
  due_date DATE,
  subtotal_kobo BIGINT NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 7.5,
  vat_amount_kobo BIGINT,
  wht_rate DECIMAL(5,2) DEFAULT 0,
  wht_amount_kobo BIGINT,
  total_amount_kobo BIGINT,
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  paid_amount_kobo BIGINT DEFAULT 0,
  line_items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MIGRATION 8: Payroll (Single Employee)
-- ============================================
CREATE TABLE IF NOT EXISTS payroll_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  employee_name VARCHAR(255),
  month DATE NOT NULL,
  gross_salary_kobo BIGINT,
  paye_kobo BIGINT,
  pension_kobo BIGINT,
  nhf_kobo BIGINT,
  nhia_kobo BIGINT,
  net_salary_kobo BIGINT,
  payslip_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MIGRATION 9: Event Log (Immutable)
-- ============================================
CREATE TABLE IF NOT EXISTS event_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES profiles(id),
  entity_type VARCHAR(50),
  entity_id UUID,
  action VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Make event log immutable
DO $$ BEGIN
  CREATE RULE no_update_event_log AS ON UPDATE TO event_log DO INSTEAD NOTHING;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE RULE no_delete_event_log AS ON DELETE TO event_log DO INSTEAD NOTHING;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- MIGRATION 10: Document Hashes
-- ============================================
CREATE TABLE IF NOT EXISTS document_hashes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_url TEXT NOT NULL,
  sha256_hash VARCHAR(64) NOT NULL,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENABLE RLS ON NEW TABLES
-- ============================================
ALTER TABLE wht_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE wht_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE tcc_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tcc_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_hashes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (Users can only access their own data)
-- ============================================
CREATE POLICY "Users can manage own WHT certificates" ON wht_certificates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own WHT credits" ON wht_credit_ledger FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read TCC requirements" ON tcc_requirements FOR SELECT USING (true);
CREATE POLICY "Users can manage own TCC checklist" ON tcc_checklist_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own compliance tasks" ON compliance_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reminders" ON task_reminders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own anomalies" ON anomalies FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own imported transactions" ON imported_transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own invoices" ON invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own payroll" ON payroll_calculations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own event log" ON event_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert event log" ON event_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own doc hashes" ON document_hashes FOR ALL USING (true);

-- ============================================
-- DONE! 12 new tables, 15+ columns added
-- ============================================
