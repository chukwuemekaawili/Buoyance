-- =========================================================================
-- Ledger schema alignment (incomes/expenses)
-- Adds columns used by the frontend correction + VAT/WHT workflows.
-- Safe to run on existing projects (uses IF NOT EXISTS / conditional FK).
-- =========================================================================

-- Incomes
ALTER TABLE public.incomes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS supersedes_id UUID,
  ADD COLUMN IF NOT EXISTS vatable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS output_vat_kobo TEXT,
  ADD COLUMN IF NOT EXISTS wht_deducted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wht_credit_kobo NUMERIC(20, 0) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN NOT NULL DEFAULT false;

-- Expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS supersedes_id UUID,
  ADD COLUMN IF NOT EXISTS vatable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS input_vat_kobo TEXT,
  ADD COLUMN IF NOT EXISTS invoice_ref TEXT;

-- Self-referential correction link (supersedes_id -> id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'incomes_supersedes_id_fkey'
  ) THEN
    ALTER TABLE public.incomes
      ADD CONSTRAINT incomes_supersedes_id_fkey
      FOREIGN KEY (supersedes_id)
      REFERENCES public.incomes(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expenses_supersedes_id_fkey'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_supersedes_id_fkey
      FOREIGN KEY (supersedes_id)
      REFERENCES public.expenses(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Helpful indexes for default queries (active records per user)
CREATE INDEX IF NOT EXISTS idx_incomes_user_status_date
  ON public.incomes(user_id, status, date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_status_date
  ON public.expenses(user_id, status, date DESC);
