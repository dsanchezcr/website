# Domain Overview

## Purpose

dsanchezcr.com is the personal website and blog of David Sanchez — a software professional who writes about software development, Azure, GitHub, developer productivity, and AI-assisted engineering. The site also serves as a showcase for personal interests (gaming, movies, 3D printing, theme parks) and a reference implementation of modern web development practices.

## Audiences

1. **Tech professionals** — reading blog posts about Azure, GitHub, DevOps, AI agents, and developer productivity
2. **Potential collaborators** — using the contact form, viewing projects and volunteering pages
3. **Personal network** — exploring entertainment sections (gaming, movies, 3D printing)
4. **AI agents** — interacting with the site as an agent-readable, specification-driven repository

## Content Domains

### Blog
Technical articles about software engineering, cloud development, AI agents, and developer productivity. Published in English with Spanish and Portuguese translations. Topics include Azure, GitHub, DevOps, AI, and open source.

### Gaming
Multi-platform gaming portfolio organized by platform: Xbox & PC, PlayStation, Nintendo Switch, Meta Quest (VR), Phone/Mobile, Board Games, Chess. Features live profile widgets (Xbox Gamerscore, PSN Trophies) and per-game status tracking (Completed, Playing, Backlog, Dropped).

### Movies & TV
Personal movie and TV series reviews with IMDb integration. Data-driven via JSON files (`src/data/movies.json`, `src/data/series.json`) with personal ratings (1-10) and multilingual reviews. Categories: recently watched, top movies, watchlist, currently watching, completed.

### 3D Printing
Portfolio of 3D printed objects with printer specifications (Bambu Lab P1S, Flashforge Adventurer Pro 3), materials used, and links to maker platforms (Makerworld, Thingiverse, Printables).

### Disney & Universal
Theme park tips and experiences for Disney and Universal parks.

### Projects
Showcase of open-source projects and professional work. Organized as a Docusaurus docs section (`projects/`) with individual pages per project and a "Previous Roles" subcategory. Features dynamic GitHub stars/forks badges via the `GitHubStats` component. Full i18n coverage (en/es/pt).

### Volunteering
Volunteering experience with organizations (Nemours, MicroMentor, Guatemala Village Health, FundaVida) displayed as cards with category badges and contact CTA.

## Key Business Rules

1. **i18n is mandatory**: All user-facing content must support English, Spanish, and Portuguese
2. **Static-first**: Content should be pre-rendered at build time; API calls only for dynamic data (weather, gaming profiles, chat, analytics)
3. **Blog post format**: MDX files with required frontmatter (`title`, `description`, `tags`, `authors`)
4. **Image naming**: Platform-specific folders under `static/img/` (e.g., `gaming/xbox/`, `gaming/playstation/`)
5. **Game statuses**: Must use the established status values: `completed`, `playing`, `backlog`, `dropped`
6. **Movie/TV data**: JSON-driven with IMDb title IDs, personal ratings, and trilingual reviews
7. **Contact form security**: reCAPTCHA v3 + honeypot + rate limiting + spam detection + email verification
8. **RAG chatbot**: Content automatically indexed to Azure AI Search after each deployment
