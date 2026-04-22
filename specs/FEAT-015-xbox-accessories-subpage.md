# Xbox Accessories Subpage for Gaming Section

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | FEAT-015 |
| **Title** | Add Xbox accessories subpage with setup and games |
| **Author** | GitHub Copilot |
| **Date** | 2026-04-22 |
| **Status** | Implemented |
| **Related ADR** | N/A |

## Problem Statement

The Xbox section needs a dedicated subpage to describe my gaming accessories setup and the games I play with those accessories.

## Expected Behavior

The Xbox section includes a new subpage under `gaming/xbox/` that explains:
- Thrustmaster T-Flight Hotas One
- Logitech G PRO Flight Yoke System with Rudder Pedals
- Logitech G920 with Driving Force Shifter using the GT Omega Apex wheel stand
- Games played with this setup: Flight Simulator, Ace Combat, Chorus, Forza Horizon, SnowRunner, and exploration of more titles

## Constraints

- [x] Keep changes inside the gaming docs structure
- [x] Provide i18n coverage in English, Spanish, and Portuguese
- [x] Do not modify gaming component code
- [x] Keep existing Xbox index page behavior intact

## Technical Design

### Affected Files

| File | Action | Description |
|------|--------|-------------|
| `gaming/xbox/accessories.mdx` | Create | New English accessories subpage |
| `i18n/es/docusaurus-plugin-content-docs-gaming/current/xbox/accessories.mdx` | Create | Spanish translation |
| `i18n/pt/docusaurus-plugin-content-docs-gaming/current/xbox/accessories.mdx` | Create | Portuguese translation |
| `gaming/xbox/index.mdx` | Modify | Add link to accessories subpage |
| `i18n/es/docusaurus-plugin-content-docs-gaming/current/xbox/index.mdx` | Modify | Add localized link to accessories subpage |
| `i18n/pt/docusaurus-plugin-content-docs-gaming/current/xbox/index.mdx` | Modify | Add localized link to accessories subpage |

## i18n Requirements

- [x] New user-facing content added in English, Spanish, and Portuguese
- [x] Localized copy mirrors the same information across all locales

## Acceptance Criteria

- [x] New Xbox accessories subpage exists in English
- [x] Matching Spanish and Portuguese subpages exist
- [x] Xbox index pages link to the new subpage in all locales
- [x] Site build and tests pass after changes

## Security Considerations

No new external input, API integration, or executable code is introduced.
