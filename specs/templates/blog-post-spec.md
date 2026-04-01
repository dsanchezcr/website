# Blog Post Specification Template

> Copy this template when planning a new blog post. Ensures consistent quality and i18n coverage.

## Metadata

| Field | Value |
|-------|-------|
| **Spec ID** | BLOG-XXX |
| **Title** | _Blog post title_ |
| **Author** | _Author key from `blog/authors.yml`_ |
| **Target Date** | _YYYY-MM-DD (used in filename)_ |
| **Status** | Idea / Drafting / Review / Published |
| **Tags** | _Comma-separated list_ |

## Topic

_One-paragraph summary of what this post covers and why it matters._

## Target Audience

_Who will benefit from reading this? (e.g., developers, DevOps engineers, managers)_

## Key Points

_Outline the main sections or arguments. Each should be a complete thought:_

1. _Section 1: ..._
2. _Section 2: ..._
3. _Section 3: ..._

## References & Research

_Sources, links, prior art:_

- _Reference 1_
- _Reference 2_

## Visual Assets

_Images, diagrams, code samples needed:_

| Asset | Type | Location | Description |
|-------|------|----------|-------------|
| Hero image | Image | `static/img/blog/` | _Description_ |
| Architecture diagram | Mermaid/Image | Inline | _Description_ |

## Files to Create

| File | Description |
|------|-------------|
| `blog/YYYY-MM-DD-Title.mdx` | English blog post |
| `i18n/es/docusaurus-plugin-content-blog/YYYY-MM-DD-Title.mdx` | Spanish translation |
| `i18n/pt/docusaurus-plugin-content-blog/YYYY-MM-DD-Title.mdx` | Portuguese translation |
| `static/img/blog/<image-name>` | Supporting images (if any) |

## Frontmatter Template

```yaml
---
title: "Title"
description: "Description for SEO and social sharing"
slug: title-slug
authors: [dsanchezcr]
tags: [tag1, tag2]
image: /img/blog/image-name.png
---
```

## i18n Checklist

- [ ] English version complete in `blog/`
- [ ] Spanish translation in `i18n/es/docusaurus-plugin-content-blog/`
- [ ] Portuguese translation in `i18n/pt/docusaurus-plugin-content-blog/`
- [ ] Translations preserve all code blocks, links, and images
- [ ] Frontmatter consistent across all 3 versions

## Review Criteria

- [ ] Technical accuracy verified
- [ ] Code examples tested/validated
- [ ] Grammar and readability reviewed
- [ ] SEO: description, tags, and title optimized
- [ ] Images have alt text
- [ ] Links are valid and accessible
