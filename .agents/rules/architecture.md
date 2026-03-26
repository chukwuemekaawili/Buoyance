# Architecture: Buoyance

**Project State**: live-and-maintained

## Summary
Buoyance is a comprehensive tax compliance and financial management platform tailored for the Nigerian market (CIT, PIT, VAT, WHT, TCC). It centralizes financial data from bank accounts to automate calculations, generate filings, and manage payments.

## Stack
- **Frontend**: React 18, TypeScript, Vite, React Router
- **Styling**: Tailwind CSS, shadcn/ui primitives
- **Data/State**: TanStack Query, Supabase Client
- **BaaS**: Supabase (Auth, Database, Edge Functions)
- **Forms**: React Hook Form, Zod
- **Analytics**: PostHog

## Key Folders & Entry Points
- `src/main.tsx`: React application entry point.
- `src/components/`: UI components (Dashboard, Calculators, etc.).
- `src/hooks/`: Business logic hooks (e.g., `useAuth`).
- `supabase/functions/`: Backend logic (Edge Functions).
- `docs/project/`: Existing technical documentation.

## Risky Areas
- **Authentication**: Core auth surface currently appears broken in production (failed fetch to Supabase).
- **Tax Logic**: Nigerian tax calculations must remain precise and compliant.
- **Supabase Integration**: Direct client usage (`src/integrations/supabase/client.ts`) with hardcoded URLs (risk for environment consistency).

## Rules
1. **Inspect Before Change**: Always check the existing folder structure and file patterns before modifying code.
2. **Extend Patterns**: Prefer extending existing UI components and logic patterns over introducing new ones.
3. **Small & Reversible**: Keep all code changes atomic and easy to rollback.
4. **Identify Blast Radius**: List all affected files and imports before starting an edit.
5. **No Blind Success**: Verification (manual or automated) is required before claiming a task is done.
6. **Tooling Constraint**: Do not introduce new libraries, frameworks, or architectural layers unless explicitly requested.
7. **Preserve Behavior**: Do not alter existing URLs, data flows, or user-visible behaviors unless strictly required by the task.
