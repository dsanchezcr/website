# Feature Specification: Privacy & Data Transparency Page

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | FEAT-001 |
| **Title** | Privacy & Data Transparency Page |
| **Author** | GitHub Copilot |
| **Date** | 2026-04-23 |
| **Status** | Implemented |
| **Related ADR** | N/A |

## Problem Statement

The website collects usage data through Google Analytics, uses reCAPTCHA for spam protection, and integrates with multiple third-party services. There is no user-facing page explaining these practices, what data is collected, or the author's commitment to never displaying advertisements. With the upcoming Newsletter feature (FEAT-002), a privacy page becomes essential before asking users for email addresses.

## Expected Behavior

A dedicated `/privacy` page accessible from the footer that transparently documents all telemetry, third-party services, data collection practices, cookie usage, and the no-ads commitment. Available in all three languages (en/es/pt).

## Constraints

- [x] Must support i18n (en/es/pt)
- [x] Must work with existing Docusaurus build
- [x] Must not require new Azure resources
- [x] Must be a static MDX page (no API calls needed)

## Technical Design

### Affected Files

| File | Action | Description |
|------|--------|-------------|
| `src/pages/privacy.mdx` | Create | Privacy page (English) |
| `i18n/es/docusaurus-plugin-content-pages/privacy.mdx` | Create | Spanish translation |
| `i18n/pt/docusaurus-plugin-content-pages/privacy.mdx` | Create | Portuguese translation |
| `docusaurus.config.js` | Modify | Add "Privacy" link to footer |
| `i18n/es/docusaurus-theme-classic/footer.json` | Modify | Add footer link translations |
| `i18n/pt/docusaurus-theme-classic/footer.json` | Modify | Add footer link translations |

### Page Sections
1. Introduction — commitment to transparency
2. Analytics — Google Analytics (GA4, anonymizeIP)
3. Spam Protection — reCAPTCHA v3
4. Third-Party Services — Giscus, Open-Meteo, Algolia, Azure services
5. Contact Form — data flow, no storage, 24h token TTL
6. Newsletter — email + preferences stored, unsubscribe anytime
7. Cookies — what's set and by whom
8. No Advertisements — explicit commitment
9. Open Source — GitHub link
10. Contact — how to reach out

## i18n Requirements

- [x] New user-facing text has translations in all 3 locales
- [x] Translated content files created in `i18n/es/` and `i18n/pt/`
- [x] Uses MDX page pattern (same as `about.mdx`)

## Acceptance Criteria

- [x] Page renders at `/privacy`, `/es/privacy`, `/pt/privacy`
- [x] Footer contains "Privacy" link in all locales
- [x] All content accurately reflects current data practices
- [x] Page builds without errors
- [x] No new lint errors

## Security Considerations

None — static content page only.

## Out of Scope

- Cookie consent banner (can be added separately)
- GDPR data export/deletion features
