# Blog Post Specification: Golden Paths for Agents

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | BLOG-001 |
| **Title** | Golden Paths for Agents: Why Platform Engineering is the Missing Layer |
| **Author** | dsanchezcr |
| **Target Date** | 2026-08-31 |
| **Status** | Drafting |
| **Tags** | Platform Engineering, AI, Agentic AI, DevOps, Developer Experience, Golden Paths |

## Topic

This post explains why AI agents need a platform engineering layer rather than just access to repositories and tools. It defines agent-ready golden paths as paved, governed workflows that encode preferred architectures, permissions, quality gates, and observability so that both developers and agents can deliver safely and consistently.

## Target Audience

Platform engineers, DevOps engineers, engineering leaders, and software teams adopting AI coding agents.

## Key Points

1. Agents amplify existing delivery friction and ambiguity instead of resolving it.
2. Golden paths give agents bounded, repeatable ways to build, test, deploy, and operate software.
3. An agent-ready platform combines paved workflows, machine-readable context, scoped access, verification, and feedback.
4. Teams should start with one high-frequency workflow, measure outcomes, and evolve the platform through real usage.

## References & Research

- [Platform Engineering](https://platformengineering.org/)
- [CNCF Platforms White Paper](https://tag-app-delivery.cncf.io/whitepapers/platforms/)
- [GitHub Copilot coding agent](https://github.com/features/copilot/agents)

## Visual Assets

| Asset | Type | Location | Description |
|-------|------|----------|-------------|
| Hero image | Image | `static/img/blog/2026-08-31-golden-paths-agents/` | A platform control plane connecting humans and AI agents through paved delivery paths. |
| Platform flow | Mermaid | Inline | Shows how intent moves through a golden path to validated delivery and feedback. |

## Files to Create

| File | Description |
|------|-------------|
| `blog/2026-08-31-GoldenPathsForAgents.mdx` | English blog post |
| `i18n/es/docusaurus-plugin-content-blog/2026-08-31-GoldenPathsForAgents.mdx` | Spanish translation |
| `i18n/pt/docusaurus-plugin-content-blog/2026-08-31-GoldenPathsForAgents.mdx` | Portuguese translation |
| `static/img/blog/2026-08-31-golden-paths-agents/golden-paths-agents.webp` | Hero image |

## i18n Checklist

- [x] English version complete in `blog/`
- [x] Spanish translation in `i18n/es/docusaurus-plugin-content-blog/`
- [x] Portuguese translation in `i18n/pt/docusaurus-plugin-content-blog/`
- [x] Translations preserve all links and diagrams
- [x] Frontmatter is consistent across all three versions

## Review Criteria

- [x] Technical accuracy verified
- [x] Grammar and readability reviewed
- [x] SEO description, tags, and title optimized
- [x] Hero image has descriptive alt text
- [x] Links are valid and accessible
