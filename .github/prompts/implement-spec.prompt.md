---
description: "Implement a feature from an approved specification. Use after a spec has been reviewed and approved."
---
# Implement from Specification

Implement a feature based on an approved specification, following the project constitution and coding standards.

## Steps

1. Read the specification from the provided path in `specs/`.

2. Verify the spec status is **Approved** (do not implement Draft or In Review specs).

3. Read the project's coding standards at `.github/repo-docs/coding-standards.md`.

4. Implement changes following the spec's "Files to Create/Modify" section:
   - Create files in the documented locations
   - Follow existing patterns in the codebase
   - Respect naming conventions

5. For each changed file, verify:
   - i18n coverage: translations created for all 3 locales
   - Tests: write tests for new behavior (Vitest for frontend, xUnit for backend)
   - Images: placed in correct `static/img/` subdirectory

6. Run tests to verify:
   - `npm test` for frontend
   - `dotnet test api.tests/api.tests.csproj` for backend

7. Update the spec status to **Implemented**.

8. Log the implementation decision in `.specify/memory/decisions.md`.

## Input

Path to the approved specification: ${input:spec_path}
