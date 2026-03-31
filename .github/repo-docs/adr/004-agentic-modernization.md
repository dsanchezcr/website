# ADR-004: Agentic Modernization — Agent-First Repository Design

## Status
Accepted

## Date
2026-03-31

## Context
The website has evolved alongside a series of blog posts about AI-assisted software engineering:
- *Agentic DevOps* — DevOps maturity as a safety enabler for AI agents
- *Evolution of Software Engineering* — Engineers as system orchestrators
- *Humans and Agents* — Two-speed collaboration model
- *Designing Software for an Agent-First World* — Repository as executable knowledge base
- *From Prompts to Specs* — Specification-driven development
- *Measuring Developer Productivity* — Outcome-based metrics (DORA)
- *Building Your AI Agent Team* — 4-layer architecture (Agents → Spec Kit → APM → Squad)
- *AI Apps with Azure and GitHub Models* — Experiment-to-production pipeline

The website should practice what the blog preaches — becoming a reference implementation of agent-first patterns.

## Decision
Adopt a **phased agentic modernization** of the repository:

### Phase 1: Agent-First Repository Foundation (this ADR)
- Repository documentation in `.github/repo-docs/` (isolated from Docusaurus content)
- Architecture, domain, and coding standards documentation
- Architecture Decision Records
- Specification templates for features and content
- Updated copilot-instructions.md with agent team references

### Phase 2: Custom Agent Team
- 8 specialized `.agent.md` files in `.github/agents/` covering: blog writing, image generation, documentation, section features, best practices, testing, innovation, CI/CD quality

### Phase 3: Testing Infrastructure
- Frontend tests (Vitest), backend tests (xUnit), E2E tests (Playwright)
- CI pipeline integration with quality gates

### Phase 4: Spec Kit Integration
- Project constitution in `.specify/memory/constitution.md`
- Specification-driven development workflow

### Phase 5: CI/CD Modernization
- Content validation workflows
- Automated quality gates (Lighthouse, accessibility, link checking)

### Phase 6: Showcase
- Agentic modernization showcase page
- Meta-blog post documenting the journey

## Consequences
- **Positive**: Repository becomes self-documenting and agent-readable
- **Positive**: Dogfoods the patterns advocated in blog posts — credibility through practice
- **Positive**: Testing infrastructure catches regressions from agent-generated code
- **Positive**: Specification-driven workflow ensures intent is preserved across agent interactions
- **Negative**: Maintenance overhead for documentation, specs, and agent definitions
- **Negative**: APM and Squad tools may not be GA yet — some phases are aspirational
- **Negative**: Over-engineering risk for a personal website — must balance rigor with pragmatism

## Notes
- Repository documentation lives in `.github/repo-docs/` — NOT in root `docs/` (which would conflict with Docusaurus content paths)
- Agent definitions will live in `.github/agents/` following GitHub Copilot conventions
- Specification templates in `specs/templates/` at the repo root
- Constitution in `.specify/memory/constitution.md` following Spec Kit conventions
