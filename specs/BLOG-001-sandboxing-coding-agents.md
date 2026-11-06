# Blog Post Specification: Sandboxing Coding Agents

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | BLOG-001 |
| **Title** | Sandboxing Coding Agents: GitHub Copilot and Docker |
| **Author** | dsanchezcr |
| **Target Date** | 2026-11-05 |
| **Status** | Implemented (unpublished draft) |
| **Tags** | Security, Agentic AI, GitHub Copilot, Docker, DevSecOps |
| **Reading time** | 10-12 minutes at the site's configured 200 words/minute |

## Topic

Compare the security boundaries of GitHub Copilot local sandboxing, GitHub
Copilot cloud sandboxes, and Docker Sandboxes. Explain why autonomous tool
execution needs isolation, how permissions differ from containment, and how to
choose an approach for everyday maintenance and unfamiliar, container-based
projects. Include alternatives without turning the post into a product catalog.

## Target Audience

Developers and platform engineers adopting coding agents who understand Git,
shell commands, and containers but need practical guidance on agent isolation.

## Key Points

1. Prompt injection, dependency scripts, mistakes, and excessive credentials can
   turn ordinary agent work into unintended host or remote-system access.
2. Copilot local sandboxing uses OS-level restrictions, not a separate VM.
   Explain explicit enablement, effective-policy inspection, platform-dependent
   networking, built-in file-tool limitations, and bypass controls.
3. Copilot cloud sandboxes move the session to GitHub-hosted Linux. Local sandbox
   settings do not carry over; distinguish Cloud from Actions-based sessions.
4. Docker Sandboxes uses microVMs and a private Docker Engine. Cover the current
   `sbx` CLI, supported host requirements, direct mounts versus private clones,
   proxy-managed credentials, MCP integrations, and persistence.
5. These are complementary layers: Copilot can run inside Docker Sandboxes.
   Include a decision table and two concrete, explicitly illustrative use cases.
6. Briefly compare ordinary dev containers, GitHub Codespaces, and Azure
   Container Apps dynamic sessions.
7. Finish with practical verification: harmless boundary probes, narrow egress,
   scoped credentials, reviewed output, resource limits, and cleanup. Do not
   imply that a sandbox prevents all exfiltration or validates generated code.

## References & Research

Official documentation consulted on 2026-11-05:

- [Copilot local sandboxing](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-and-local-sandboxes)
- [Copilot filesystem policy](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/understanding-local-sandboxing)
- [Copilot local configuration](https://docs.github.com/en/copilot/how-tos/cloud-and-local-sandboxes/configuring-local-sandbox-settings)
- [Copilot cloud sandboxes](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-sandboxes)
- [Copilot firewall limitations](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-the-firewall)
- [Docker Sandboxes installation](https://docs.docker.com/ai/sandboxes/install/)
- [Docker Sandboxes architecture](https://docs.docker.com/ai/sandboxes/architecture/)
- [Docker Sandboxes security model](https://docs.docker.com/ai/sandboxes/security/)
- [Docker Sandboxes workspace modes](https://docs.docker.com/ai/sandboxes/usage/)
- [Copilot in Docker Sandboxes](https://docs.docker.com/ai/sandboxes/agents/copilot/)
- [Docker credential management](https://docs.docker.com/ai/sandboxes/configuration/credentials/)
- [Docker local/cloud differences](https://docs.docker.com/ai/sandboxes/cloud/local-vs-cloud/)
- [GitHub Codespaces security](https://docs.github.com/en/codespaces/reference/security-in-github-codespaces)
- [Azure Container Apps dynamic sessions](https://learn.microsoft.com/en-us/azure/container-apps/sessions)

Use original prose and inline citations. Validate command syntax against official
documentation; do not claim these authenticated sandbox sessions were executed.
Avoid exact prices and unsupported availability or guarantee claims.

## Visual Assets

| Asset | Type | Location | Description |
|-------|------|----------|-------------|
| Hero image | Original illustration, JPEG | `static/img/blog/2026-11-05-sandboxing-coding-agents/sandboxing-coding-agents.jpg` | Bright, text-free 16:9 illustration of a coding agent, layered execution boundaries, and controlled access to files and networks |
| Comparison | Markdown table | All three MDX posts | Scenario, recommended approach, and tradeoff |
| Commands | Fenced text/bash | All three MDX posts | Copilot policy inspection, cloud session launch, and Docker clone-mode setup |

Use the blog-image agent and existing Gemini script when credentials are
available. `GOOGLE_AI_KEY` and repository `.env.local` are unavailable in this
session, so create an original SVG illustration and rasterize it to JPEG for
the hero and social previews instead. Do not describe it as Gemini-generated.
Keep the final image below 500 KB. Use the same raw GitHub image URL in all
locales, with localized descriptive alt text.

## Files to Create or Update

| File | Description |
|------|-------------|
| `blog/2026-11-05-SandboxingCodingAgents.mdx` | English draft |
| `i18n/es/docusaurus-plugin-content-blog/2026-11-05-SandboxingCodingAgents.mdx` | Spanish draft |
| `i18n/pt/docusaurus-plugin-content-blog/2026-11-05-SandboxingCodingAgents.mdx` | Portuguese draft |
| `static/img/blog/2026-11-05-sandboxing-coding-agents/sandboxing-coding-agents.jpg` | Shared hero |
| `scripts/extract-content.js` | Exclude draft blog posts from the public search/chat index payload |
| `.github/workflows/newsletter-dispatch.yml` | Exclude draft posts from newsletter extraction in every locale |
| `src/__tests__/blogDrafts.test.js` | Focused regression coverage for draft exclusion and published-post retention |

## Frontmatter

All locales use `authors: [dsanchezcr]`, identical tags, date, slug, image URL,
`enableComments: true`, `hide_table_of_contents: true`, and `draft: true`.
Translate titles and descriptions.

The draft must stay out of production blog output, the search indexing payload,
and newsletter extraction. Publication is a separate editorial decision: remove
`draft: true` in all three locales only after approval. No deployment, commit,
cloud sandbox creation, or paid sandbox session is part of this task.

## Review Criteria

- [x] All three reading times are 10-12 minutes using the site's reading-time implementation.
- [x] English, Spanish, and Portuguese cover the same technical claims and use cases.
- [x] Code blocks and link/image destinations match across locales.
- [x] All required frontmatter is present and the author key is valid.
- [x] MDX compiles in all locales; tables and code fences are valid.
- [x] The shared hero exists, is 16:9, is below 500 KB, and has localized alt text.
- [x] Product boundaries and commands are supported by the linked official sources.
- [x] Drafts are excluded from indexing and newsletter extraction, with published content retained.
- [x] Existing posts and unrelated application behavior are unchanged.

## Verification

- Configured Docusaurus reading time: English 11.98 minutes, Spanish 11.93,
  Portuguese 11.95.
- All three MDX bodies compile and render with one comparison table and three
  command blocks. Frontmatter, author validity, shared metadata, code, and link
  destination parity are verified.
- Docusaurus treats each post as a draft in production and includes it in
  development. Search extraction excludes the new draft while retaining the
  existing 38 published posts.
- `npm test -- src/__tests__/blogDrafts.test.js`: four passing tests cover search
  and every newsletter locale, including ordinary drafts, commented flags,
  capitalized booleans, CRLF files, and retained published posts.
- Shared JPEG: 1600 x 900 pixels, 158,137 bytes. Original locally authored SVG
  artwork rasterized with Chromium; no external image-generation API was used.
- Authenticated Copilot and Docker command examples were checked against their
  official documentation, not executed as live sandbox sessions.

## Scope and Review

The specification is approved for implementation against the constitution:
static-first MDX content, mandatory three-locale coverage, no credentials or
unsafe live demonstrations, and a narrowly scoped draft-publication safeguard.
No new application feature, dependency, infrastructure, or architectural
decision is required.
