---
description: "Verify that an implementation satisfies its specification's acceptance criteria."
---
# Verify Implementation

Verify that the implementation matches the specification's acceptance criteria and passes all quality gates.

## Steps

1. Read the specification from the provided path in `specs/`.

2. Walk through each acceptance criterion and verify:
   - [ ] Criterion met? (check the code, run tests, inspect output)
   - [ ] Tests written and passing?
   - [ ] i18n verified in all 3 locales?
   - [ ] No new lint errors?
   - [ ] No security issues introduced?

3. Run the full test suite:
   - `npm test` for frontend tests
   - `dotnet test api.tests/api.tests.csproj` for backend tests

4. Check for regressions:
   - Existing tests still pass?
   - Build completes without errors? (`npm run build`)

5. Provide a verification report:
   - **All criteria met**: Implementation is complete
   - **Partial**: List unmet criteria
   - **Failed**: List failures and needed fixes

## Input

Path to the specification to verify: ${input:spec_path}
