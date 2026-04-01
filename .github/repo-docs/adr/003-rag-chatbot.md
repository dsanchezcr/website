# ADR-003: RAG Chatbot with Microsoft Foundry and AI Search

## Status
Accepted

## Date
2024-01-01

## Context
Wanted to add an AI chatbot to the website that can answer questions about the site's content (blog posts, projects, about page, etc.) rather than providing generic AI responses.

## Decision
Implement a **Retrieval-Augmented Generation (RAG)** pattern using:
- **Azure AI Search** as the knowledge store (content indexed from MDX files and GitHub repos)
- **Microsoft Foundry** (GPT model) for natural language generation
- **Automatic indexing** triggered by GitHub Actions after each deployment
- **Content extraction** via `scripts/extract-content.js` (Node.js script that parses MDX files)

### Data Flow
1. GitHub Actions builds the site
2. `extract-content.js` extracts content from MDX files → writes to temp JSON file
3. POST request to `/api/reindex` sends content to Azure AI Search index
4. GitHub repos fetched live from GitHub API and indexed alongside
5. `/api/nlweb/ask` queries AI Search for relevant context, injects into OpenAI prompt

## Consequences
- **Positive**: Chatbot answers are grounded in actual site content — reduces hallucination
- **Positive**: Content stays current automatically (reindexed on every deployment)
- **Positive**: Rate limiting and abuse detection protect the AI endpoint
- **Negative**: Requires Microsoft Foundry and AI Search resources (cost)
- **Negative**: Index update is best-effort (`continue-on-error: true`) — stale index possible
- **Negative**: Session memory is in-memory only — lost on function restart
