# Blog Post Specification: AccessiWeb Engine

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | BLOG-001 |
| **Title** | AccessiWeb Engine: AI-Assisted Web Accessibility |
| **Author** | dsanchezcr |
| **Target Date** | 2026-11-06 |
| **Status** | Review |
| **Tags** | Accessibility, AI, GitHub, Hackathon |

## Topic

A short, professional first-person introduction to the project David created for
the Meta Global AI Developer Hackathon. Focus on the practical use case:
helping small development teams turn accessibility findings into reviewable
GitHub work, rather than listing infrastructure or making claims about impact.

## Target Audience

Developers and small teams that want to address accessibility barriers in their
websites and connect audit findings to their existing development workflow.

## Key Points

1. Use missing image descriptions, unlabeled controls, and heading structure as a
   concrete, illustrative pre-launch review scenario.
2. Explain public URL and small public repository audits, structured
   WCAG-oriented findings, Meta AI analysis, and optional user-supplied screenshots.
3. Describe authorized GitHub issues and the separately gated remediation
   preview: an approved patch plan becomes a pull request in a bot-owned fork,
   without upstream pushes or automatic merging.
4. Distinguish AI-assisted static analysis from manual accessibility testing and
   verified conformance. Do not claim awards, production adoption, or measured
   improvements.

## References & Research

- [Official event](https://cerebralvalley.ai/e/meta-ai-developer-hackathon):
  Meta Global AI Developer Hackathon, hosted by Meta and Cerebral Valley.
- [Project](https://github.com/dsanchezcr/accessiWebEngine):
  README and `docs/HACKATHON_SUBMISSION.md` describe the supported workflows.
- Project `apps/api/src/domBaseline.ts` confirms the static HTML checks;
  `packages/shared/src/types.ts` defines severity, WCAG references, file/line
  context, and suggested fixes.

## Visual Assets

| Asset | Location | Description |
|-------|----------|-------------|
| Hero image | `static/img/blog/2026-11-06-accessiweb-engine/accessiweb-engine.jpg` | Original bright 16:9 illustration connecting a web interface, accessibility findings, and human-reviewed code changes. No text or logos; under 500 KB. |

Use the Google Gemini image-generation script when configured. Reference the
committed asset locally in the article and use its raw GitHub main-branch URL in
frontmatter. Localized alt text must describe the actual illustration.

The final image is an original local illustration, 1600x900 and 220,628 bytes.
Gemini was unavailable because `GOOGLE_AI_KEY` was not configured; no cloud
uploads were performed.

## Files to Create

| File | Description |
|------|-------------|
| `blog/2026-11-06-AccessiWebEngine.mdx` | English post |
| `i18n/es/docusaurus-plugin-content-blog/2026-11-06-AccessiWebEngine.mdx` | Spanish translation |
| `i18n/pt/docusaurus-plugin-content-blog/2026-11-06-AccessiWebEngine.mdx` | Portuguese translation |
| `static/img/blog/2026-11-06-accessiweb-engine/accessiweb-engine.jpg` | Shared hero image |

## Frontmatter

All locales include localized `title` and `description`, plus identical
`slug: accessiweb-engine-meta-ai-hackathon`, `authors: [dsanchezcr]`,
`tags: [Accessibility, AI, GitHub, Hackathon]`, `enableComments: true`,
`hide_table_of_contents: true`, `date: 2026-11-06T10:00`, and
`image: https://raw.githubusercontent.com/dsanchezcr/website/refs/heads/main/static/img/blog/2026-11-06-accessiweb-engine/accessiweb-engine.jpg`.

## i18n Checklist

- [x] English, Spanish, and Portuguese versions are complete.
- [x] Translations preserve the claims, section structure, URLs, and image path.
- [x] Frontmatter is consistent apart from localized titles and descriptions.
- [x] Image alt text is meaningful and localized.

## Review Criteria

- [x] Each article stays under 350 words, excluding frontmatter and image alt text.
- [x] The use case is prominent; prose is professional, concrete, and free of hype.
- [x] Technical claims agree with the public project sources.
- [x] Preview restrictions and the need for human testing remain explicit.
- [x] MDX compiles and the image exists at the referenced path under 500 KB.
- [x] Existing posts, application behavior, and dependencies remain unchanged.

## Verification

The English, Spanish, and Portuguese articles contain 235, 295, and 281 words,
respectively. All three compile with the repository's `@mdx-js/mdx` version
3.1.1; frontmatter was checked with its `@11ty/gray-matter` version 1.0.0.
Shared metadata, URLs, image paths, alt text, and image size were verified.

Full dependency restoration was blocked by the existing package mirror, so the
compiler and parser were installed temporarily from npm for targeted content
validation. No dependency manifests or lockfiles were changed.
