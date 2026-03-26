---
description: How to verify work in this repo
---

# Skill: Run Tests (Buoyance)

This skill describes the real verification workflow for the Buoyance repository.

## Verification Workflow

### 1. Identify Changed Files
Before running any checks, list the files modified to determine the relevant test scope.

### 2. Static Analysis (Linting)
Run the project's linter to ensure code style consistency.
```bash
npm run lint
```

### 3. Build Verification
Ensure the project still compiles correctly using Vite.
```bash
npm run build
```

### 4. Automated Tests (Vitest)
If tests exist for the modified unit/feature, run Vitest.
```bash
npx vitest
```

### 5. Local Manual Verification
Start the development server and verify the changes in a browser.
```bash
npm run dev
```
**Manual Checks**:
- Navigate to the affected page.
- Interact with the modified UI elements.
- Check browser console for errors.

## Output Format Requirement
Each verification report must include:
- **Changed Files**: List of modified files.
- **Verification Commands**: Exact commands run.
- **Manual Checks**: Key UI/UX interactions verified.
- **Status**: PASS/FAIL.
- **Uncertainty**: Any areas not fully verified.

> [!NOTE]
> If no automated tests exist for a specific task, rely on strict manual verification on the local dev server.
