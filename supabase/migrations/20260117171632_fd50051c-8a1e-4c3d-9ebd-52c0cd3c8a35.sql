-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create classification_rules table for AI-powered tax classification
CREATE TABLE public.classification_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('expense', 'income')),
  category_key TEXT NOT NULL,
  category_label TEXT NOT NULL,
  default_value BOOLEAN NOT NULL DEFAULT false,
  legal_reference TEXT,
  reasoning TEXT,
  examples TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(rule_type, category_key)
);

-- Enable RLS
ALTER TABLE public.classification_rules ENABLE ROW LEVEL SECURITY;

-- Everyone can read classification rules (needed for Edge Function and UI)
CREATE POLICY "classification_rules_select_all" 
ON public.classification_rules 
FOR SELECT 
USING (true);

-- Only admins can insert
CREATE POLICY "classification_rules_insert_admin" 
ON public.classification_rules 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update
CREATE POLICY "classification_rules_update_admin" 
ON public.classification_rules 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "classification_rules_delete_admin" 
ON public.classification_rules 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_classification_rules_updated_at
BEFORE UPDATE ON public.classification_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default expense classification rules
INSERT INTO public.classification_rules (rule_type, category_key, category_label, default_value, legal_reference, reasoning, examples) VALUES
-- DEDUCTIBLE EXPENSES
('expense', 'rent', 'Office Rent / Workspace', true, 'PITA Section 24 / CITA Section 24', 'Business premises costs are wholly and exclusively for business purposes', ARRAY['Office rent', 'Co-working space', 'Warehouse rent']),
('expense', 'salaries', 'Salaries / Wages', true, 'PITA Section 24(a)', 'Employee compensation is a deductible business expense', ARRAY['Staff salaries', 'Contractor wages', 'Bonuses']),
('expense', 'utilities', 'Internet / Data / Utilities', true, 'PITA Section 24', 'Business utility costs are deductible operating expenses', ARRAY['Internet subscription', 'Mobile data', 'Water bills']),
('expense', 'power', 'Power / Diesel / Inverter', true, 'PITA Section 24', 'Power generation costs for business operations are deductible', ARRAY['Diesel for generator', 'Electricity bills', 'Inverter maintenance']),
('expense', 'marketing', 'Marketing / Advertising', true, 'PITA Section 24', 'Marketing expenses to promote business are deductible', ARRAY['Social media ads', 'Print advertising', 'Promotional materials']),
('expense', 'transport', 'Transport / Logistics', true, 'PITA Section 24', 'Business transportation costs are deductible', ARRAY['Delivery costs', 'Business travel', 'Fuel for business vehicles']),
('expense', 'cogs', 'Cost of Goods Sold (COGS)', true, 'CITA Section 24', 'Direct costs of producing goods sold are deductible', ARRAY['Raw materials', 'Inventory purchases', 'Manufacturing supplies']),
('expense', 'professional', 'Professional Services (Legal/Audit)', true, 'PITA Section 24', 'Professional fees for business services are deductible', ARRAY['Legal fees', 'Audit fees', 'Consulting fees']),
('expense', 'insurance', 'Business Insurance', true, 'PITA Section 24', 'Insurance premiums for business protection are deductible', ARRAY['Liability insurance', 'Property insurance', 'Health insurance for staff']),
('expense', 'software', 'Software / Subscriptions', true, 'PITA Section 24', 'Business software and tool subscriptions are deductible', ARRAY['SaaS subscriptions', 'Cloud services', 'Business tools']),
('expense', 'equipment', 'Equipment / Supplies', true, 'PITA Section 24', 'Business equipment and supplies are deductible (or qualify for capital allowance)', ARRAY['Office supplies', 'Computer equipment', 'Furniture']),
('expense', 'maintenance', 'Repairs / Maintenance', true, 'PITA Section 24', 'Repair and maintenance costs are deductible business expenses', ARRAY['Equipment repairs', 'Building maintenance', 'Vehicle servicing']),
-- NON-DEDUCTIBLE EXPENSES
('expense', 'personal', 'Personal / Groceries', false, 'PITA Section 27', 'Personal living expenses are not deductible for tax purposes', ARRAY['Personal groceries', 'Home utilities', 'Personal clothing']),
('expense', 'entertainment', 'Entertainment', false, 'PITA Section 27(d)', 'Entertainment expenses are generally not deductible unless wholly business-related', ARRAY['Personal dining', 'Recreation', 'Social events']),
('expense', 'fines', 'Fines / Penalties', false, 'PITA Section 27', 'Fines and penalties imposed by law are not deductible', ARRAY['Traffic fines', 'Tax penalties', 'Regulatory fines']),
('expense', 'donations_unapproved', 'Donations (Non-approved)', false, 'PITA Section 27', 'Donations to non-approved organizations are not tax deductible', ARRAY['Personal charity', 'Political donations', 'Non-registered NGO donations']);

-- Insert default income classification rules
INSERT INTO public.classification_rules (rule_type, category_key, category_label, default_value, legal_reference, reasoning, examples) VALUES
-- TAXABLE INCOME (tax_exempt = false)
('income', 'salary', 'Salary / Employment Income', false, 'PITA Section 3(1)', 'Employment income is subject to Personal Income Tax', ARRAY['Monthly salary', 'Annual bonus', 'Commissions']),
('income', 'freelance', 'Freelance / Contract Work', false, 'PITA Section 3(1)', 'Income from freelance work is taxable as business income', ARRAY['Freelance projects', 'Contract work', 'Gig payments']),
('income', 'business', 'Business Sales / Revenue', false, 'CITA/PITA Section 3', 'Revenue from trade or business is subject to income tax', ARRAY['Product sales', 'Service revenue', 'Trading income']),
('income', 'consulting', 'Consulting Fees', false, 'PITA Section 3(1)', 'Professional consulting income is taxable', ARRAY['Advisory fees', 'Consultancy projects', 'Expert witness fees']),
('income', 'rental', 'Rental Income', false, 'PITA Section 3(1)(a)', 'Income from property rental is subject to tax', ARRAY['Property rent', 'Equipment rental', 'Vehicle hire']),
('income', 'investment', 'Investment Returns', false, 'PITA Section 3', 'Investment income including dividends and interest is taxable', ARRAY['Dividends', 'Interest income', 'Capital gains']),
-- TAX-EXEMPT INCOME (tax_exempt = true)
('income', 'loan', 'Personal Loan Received', true, 'PITA First Schedule', 'Loans are not income and are exempt from taxation', ARRAY['Bank loan', 'Personal loan', 'Family loan']),
('income', 'gift', 'Gift / Personal Transfer', true, 'PITA First Schedule', 'Personal gifts not connected to employment are generally exempt', ARRAY['Birthday gift', 'Family gift', 'Wedding gift']),
('income', 'grant', 'Grant / Scholarship', true, 'PITA First Schedule', 'Educational and approved grants are exempt from tax', ARRAY['Research grant', 'Educational scholarship', 'Government grant']),
('income', 'refund', 'Refund / Reimbursement', true, 'General Tax Principles', 'Refunds of previously paid amounts are not taxable income', ARRAY['Product refund', 'Expense reimbursement', 'Overpayment return']),
('income', 'compensation', 'Compensation / Settlement', true, 'PITA First Schedule', 'Compensation for personal injury or loss may be exempt', ARRAY['Insurance payout', 'Legal settlement', 'Injury compensation']);