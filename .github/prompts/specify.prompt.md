---
description: "Create a feature specification. Use when planning a new feature, component, API endpoint, or content addition before implementation."
---
# Specify a Feature

Create a specification for the requested feature using the appropriate template from `specs/templates/`.

## Steps

1. Determine the spec type:
   - New feature → `specs/templates/feature-spec.md`
   - New blog post → `specs/templates/blog-post-spec.md`
   - New API endpoint → `specs/templates/api-endpoint-spec.md`
   - New gaming content → `specs/templates/gaming-content-spec.md`

2. Read the chosen template and the project constitution at `.specify/memory/constitution.md`.

3. Fill in the template with the feature details. Assign a sequential ID:
   - Features: `FEAT-XXX`
   - Blog posts: `BLOG-XXX`
   - API endpoints: `API-XXX`
   - Gaming content: `GAME-XXX`

4. Save the spec to `specs/` with a descriptive filename (e.g., `specs/FEAT-001-new-widget.md`).

5. Validate the spec against the constitution:
   - Does it respect i18n requirements (en/es/pt)?
   - Does it stay within the technology constraints?
   - Does it list all affected files?
   - Does it define acceptance criteria?

6. Present the spec for review before implementation.

## Input

Describe the feature you want to build: ${input:feature_description}
