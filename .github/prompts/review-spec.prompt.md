---
description: "Review a specification for completeness, constitutional compliance, and implementability before starting work."
---
# Review a Specification

Review the given specification against the project constitution and quality standards.

## Steps

1. Read the specification file from `specs/`.

2. Read the project constitution at `.specify/memory/constitution.md`.

3. Check each section for completeness:
   - [ ] Problem statement is clear and specific
   - [ ] Expected behavior is testable
   - [ ] Constraints are listed (i18n, security, performance)
   - [ ] Affected files are identified
   - [ ] API contracts defined (if applicable)
   - [ ] Edge cases documented
   - [ ] Acceptance criteria are measurable
   - [ ] i18n requirements addressed (all 3 locales)
   - [ ] Security considerations noted
   - [ ] Out of scope defined

4. Validate constitutional compliance:
   - Technology constraints respected?
   - i18n coverage rule satisfied?
   - Security requirements met?
   - Content standards followed?

5. Provide a review summary with:
   - **Approved**: Spec is complete and constitutional
   - **Needs revision**: List specific gaps or issues
   - **Rejected**: Explain constitutional violations

## Input

Path to the specification to review: ${input:spec_path}
