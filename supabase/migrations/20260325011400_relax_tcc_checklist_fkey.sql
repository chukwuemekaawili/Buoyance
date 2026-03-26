-- Relaxing requirement_id type to support stable string-based reference keys (like 'tax_returns_3yr') from the frontend

ALTER TABLE tcc_checklist_items DROP CONSTRAINT IF EXISTS tcc_checklist_items_requirement_id_fkey;
ALTER TABLE tcc_checklist_items ALTER COLUMN requirement_id TYPE VARCHAR(255);
