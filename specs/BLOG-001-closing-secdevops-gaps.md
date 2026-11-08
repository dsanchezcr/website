# Blog Post Specification: Closing the SecDevOps Gaps

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | BLOG-001 |
| **Title** | Closing the SecDevOps Gaps in the Agentic AI Era |
| **Author** | dsanchezcr |
| **Target Date** | 2026-11-08 |
| **Status** | Review |
| **Tags** | Security, DevSecOps, Agentic AI, GitHub Advanced Security, Docker, OWASP, CI/CD |

## Topic

Explain how to align GitHub Advanced Security, Docker Scout, OWASP guidance,
and complementary controls across the software development lifecycle. Focus
on coverage, enforcement, evidence, and ownership rather than accumulating
scanners. Distinguish the security of agent-assisted development from the
security of deployed agentic applications. No combination of tools guarantees
the absence of vulnerabilities.

## Target Audience

Developers, platform and DevOps engineers, application security practitioners,
and engineering leaders introducing AI agents into software delivery.

## Key Points

1. Define SecDevOps/DevSecOps and shift-left security without implying that
   prevention replaces runtime detection or response.
2. Map design, coding, dependencies, infrastructure, CI, artifacts, testing,
   deployment, operations, and retirement to controls, evidence, and owners.
3. Distinguish GitHub Code Security and Secret Protection, Docker Scout's
   artifact analysis, and OWASP's requirements and maturity guidance.
4. Recommend a small complementary stack and explain when alternatives fit,
   including language, ecosystem, licensing, data handling, and operational cost.
5. Describe a risk-based CI/CD sequence, immutable artifact promotion,
   provenance verification, failure behavior, and time-bounded exceptions.
6. Address prompt injection, tool/MCP trust, scoped identities, sandboxing,
   dependency hallucination, approval boundaries, and independent verification.
7. Close the loop with runtime feedback, measurable coverage, and a staged
   adoption plan. Avoid unsupported security, compliance, or product guarantees.

## References & Research

Primary sources reviewed on 2026-11-08. Cite sources next to material claims;
do not reproduce source prose or present this article as an OWASP standard.

- [GitHub Advanced Security products](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security)
- [Docker Scout](https://docs.docker.com/scout/)
- [Docker Scout image analysis](https://docs.docker.com/scout/explore/analysis/)
- [Docker Scout policies](https://docs.docker.com/scout/policy/)
- [OWASP ASVS](https://asvs.owasp.org/)
- [OWASP SAMM](https://owaspsamm.org/model/)
- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [NIST SSDF](https://csrc.nist.gov/Projects/ssdf)
- [ZAP Automation Framework](https://www.zaproxy.org/docs/automate/automation-framework/)
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub Actions dependency lockfiles](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/concepts/security/openid-connect)
- [GitHub artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations)

## Visual Assets

| Asset | Type | Location | Description |
|-------|------|----------|-------------|
| Hero image | Original illustration, WebP | `static/img/blog/2026-11-08-closing-secdevops-gaps/secdevops-security-loop.webp` | Bright 16:9 illustration of connected security checkpoints across a development-to-operations loop, with a bounded agent workspace. No text, logos, or trademarks; 2400 x 1350 pixels, 243,296 bytes. |

Use the raw GitHub URL required by the blog-writer instructions in all three
frontmatters and body images. Keep the image local to the repository; no Azure
upload or other cloud configuration changes are required.

## Files to Create

| File | Description |
|------|-------------|
| `blog/2026-11-08-ClosingSecDevOpsGaps.mdx` | English article |
| `i18n/es/docusaurus-plugin-content-blog/2026-11-08-ClosingSecDevOpsGaps.mdx` | Complete Spanish translation |
| `i18n/pt/docusaurus-plugin-content-blog/2026-11-08-ClosingSecDevOpsGaps.mdx` | Complete Portuguese translation |
| `static/img/blog/2026-11-08-closing-secdevops-gaps/secdevops-security-loop.webp` | Shared hero image |

## Frontmatter Template

```yaml
---
title: "Closing the SecDevOps Gaps in the Agentic AI Era"
description: "Align GHAS, Docker Scout, OWASP, and complementary controls across the SDLC, with practical CI/CD gates and safeguards for AI agents."
slug: closing-secdevops-gaps-agentic-ai
authors: [dsanchezcr]
tags: [Security, DevSecOps, Agentic AI, GitHub Advanced Security, Docker, OWASP, CI/CD]
enableComments: true
hide_table_of_contents: true
image: https://raw.githubusercontent.com/dsanchezcr/website/refs/heads/main/static/img/blog/2026-11-08-closing-secdevops-gaps/secdevops-security-loop.webp
date: 2026-11-08T10:00
---
```

Translate the title, description, body prose, tables, and image alt text.
Preserve the filename, slug, tags, author, date, URLs, image, and any code blocks.

## Acceptance Criteria

- [x] The article includes an SDLC coverage matrix with named control owners
  and evidence, including design, delivery, operations, and retirement.
- [x] GHAS product boundaries and repository availability are accurate;
  Dependabot alerts are not described as exclusively paid features.
- [x] Docker Scout is not presented as SAST, runtime protection, or a guarantee
  that an image is safe. Continuous analysis is distinguished from a one-off scan.
- [x] OWASP guidance is distinguished from executable scanners; ASVS, SAMM,
  and agentic risks have separate roles.
- [x] Recommended alternatives have explicit purposes and tradeoffs rather
  than implying all scanners should be enabled together.
- [x] The CI/CD guidance covers least privilege, untrusted PR isolation,
  dependency integrity, trusted evidence, artifact identity, and enforced gates.
- [x] Missing, stale, failed, or incomplete required analysis is not treated as
  a successful security result. Exceptions have owners and expiration dates.
- [x] Agent controls are enforced outside the model; both development agents
  and deployed agents are addressed without promising complete prevention.
- [x] No changes are made to application code, workflows, dependencies,
  infrastructure, or existing articles.

## i18n Checklist

- [x] English version complete in `blog/`.
- [x] Spanish translation complete in `i18n/es/docusaurus-plugin-content-blog/`.
- [x] Portuguese translation complete in `i18n/pt/docusaurus-plugin-content-blog/`.
- [x] All three versions preserve links, images, code blocks, section coverage,
  and table structure.
- [x] Frontmatter is consistent except for localized title and description.

## Review Criteria

- [x] Claims checked against primary sources, with a documentation review date.
- [x] Any illustrative examples are identified as examples, not ready-to-run CI.
- [x] Grammar, technical terminology, and readability reviewed in all locales.
- [x] SEO metadata, author key, truncation marker, and descriptive alt text present.
- [x] External references and existing internal links checked.
- [x] Hero asset exists, is 16:9, and is smaller than 500KB.
- [x] Targeted frontmatter/i18n checks and MDX compilation/rendering pass for each locale.

## Scope and Constitution Review

This is static MDX content with mandatory en/es/pt parity. It introduces no
application architecture, API, infrastructure, or dependency changes and needs
no ADR. All recommendations are editorial guidance, not a claim that the
repository has implemented them. Executable scanning of third-party targets
is out of scope; active testing examples must require an authorized test environment.

## Verification Notes

- All three documents passed YAML parsing, required metadata and author checks,
  cross-locale link/structure parity, MDX compilation, and React static rendering.
  Each renders 13 headings, three tables with 25 rows, and the shared hero image.
  Both internal article destinations exist in all three locales.
- External claims were checked using directly retrieved primary documentation
  and official indexed source excerpts. Several external domains could not be
  resolved from the execution environment, so not every URL received a live
  HTTP availability check.
- The hero passed WebP decoding, exact 16:9 dimension and size checks, and visual
  inspection. The standard Gemini script could not generate an image because
  `GOOGLE_AI_KEY` was unavailable. The delivered asset is an original locally
  rendered illustration using librsvg/Cairo, not a Gemini-generated image.
  No image was uploaded to an external service.
- A full Docusaurus build could not run: dependencies were initially absent,
  and two locked-install attempts failed with package-download connection
  resets. Isolated MDX/React dependencies were used for the successful targeted
  checks without changing repository dependency manifests or lockfiles.
- These files are prepared for review; publication and deployment were not
  performed.
