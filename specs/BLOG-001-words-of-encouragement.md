# Blog Post Specification

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | BLOG-001 |
| **Title** | A Small Message, A Meaningful Moment: Building a Ronald McDonald House eCard |
| **Author** | dsanchezcr |
| **Target Date** | 2026-10-17 |
| **Status** | Drafting |
| **Tags** | Open Source, Microsoft, Volunteering, Azure, Accessibility |

## Topic

Introduce the open-source Words of Encouragement eCard project, built for an internal Microsoft Give Campaign during October 2026. Explain how volunteers create encouraging digital cards for Ronald McDonald House families, and describe the project's privacy-aware submission and review flow.

## Target Audience

Developers, Microsoft employees, and people interested in open-source projects that support community volunteering.

## Key Points

1. The project gives volunteers a simple way to create and submit supportive eCards during the Give Campaign.
2. Volunteers choose approved artwork or optionally generate a background, write a short message, and render a downloadable card in the browser.
3. Submitted cards are stored privately for organizer review; the app does not send them directly to families.
4. The app is multilingual and uses optional, server-controlled AI features, with a React/Vite frontend, Azure Functions API, and Bicep infrastructure.
5. The source is open on GitHub, while the repository's RMHC artwork is explicitly excluded from its MIT license.

## References & Research

- [Project repository](https://github.com/dsanchezcr/RonaldMcDonaldHouse)
- [Project README](https://github.com/dsanchezcr/RonaldMcDonaldHouse/blob/main/README.md)
- [Operations runbook](https://github.com/dsanchezcr/RonaldMcDonaldHouse/blob/main/docs/operations-runbook.md)

## Visual Assets

| Asset | Type | Location | Description |
|-------|------|----------|-------------|
| Hero image | Image | `static/img/blog/2026-10-17-ronald-mcdonald-house/` | Hopeful, abstract eCard illustration; no logos, text, or identifiable people |

## Files to Create

| File | Description |
|------|-------------|
| `blog/2026-10-17-WordsOfEncouragement.mdx` | English blog post |
| `i18n/es/docusaurus-plugin-content-blog/2026-10-17-WordsOfEncouragement.mdx` | Spanish translation |
| `i18n/pt/docusaurus-plugin-content-blog/2026-10-17-WordsOfEncouragement.mdx` | Portuguese translation |
| `static/img/blog/2026-10-17-ronald-mcdonald-house/` | Blog hero image |

## i18n Checklist

- [ ] English version complete
- [ ] Spanish translation complete
- [ ] Portuguese translation complete
- [ ] Translations preserve links and image references

## Review Criteria

- [ ] Campaign timing and use case are accurate
- [ ] The card review and distribution flow is not overstated
- [ ] Frontmatter and hero image reference are valid
- [ ] All three locales are present
