# ADR-001: Docusaurus v3 as Static Site Generator

## Status
Accepted

## Date
2022-12-01

## Context
Needed a static site generator for a personal website/blog that supports:
- Markdown/MDX content authoring
- Multi-language support (English, Spanish, Portuguese)
- Plugin architecture for multiple content sections (gaming, movies, etc.)
- React-based customization for interactive components
- Built-in blog functionality with RSS feeds
- Search integration (Algolia)
- Good developer experience with hot reload

## Decision
Use **Docusaurus v3** as the static site generator with:
- `preset-classic` for blog, pages, and one docs instance (universal)
- Additional `plugin-content-docs` instances for gaming, disney, and movies-tv sections
- Custom React components for interactive widgets (weather, chat, gaming profiles)
- MDX for rich content authoring

## Consequences
- **Positive**: Excellent i18n support, plugin ecosystem, React integration, strong community
- **Positive**: Multiple docs plugin instances allow independent content sections with their own sidebars
- **Negative**: Root `docs/` path is reserved by Docusaurus conventions — repository documentation must live elsewhere (`.github/repo-docs/`)
- **Negative**: SSG means no server-side rendering — dynamic content requires API calls from client
