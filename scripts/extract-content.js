/**
 * extract-content.js
 * 
 * Extracts content from MDX files and outputs JSON for the reindex API.
 * Called by GitHub Actions after deployment to main branch.
 * 
 * Usage: node scripts/extract-content.js
 * Output: JSON to stdout with { pages: [...], blogPosts: [...] }
 */

const fs = require('fs');
const path = require('path');

// Simple frontmatter parser (avoids external dependency)
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };
  
  const frontmatter = {};
  match[1].split(/\r?\n/).forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      // Handle arrays like [tag1, tag2]
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
      }
      
      frontmatter[key] = value;
    }
  });
  
  return { frontmatter, body: match[2] };
}

// Enhanced markdown stripping with code extraction
function stripAndExtractCode(content) {
  const codeBlocks = [];
  let codeBlockIndex = 0;
  
// Extract and index code blocks using a safe, linear scan (avoid regex backtracking)
  let result = '';
  let cursor = 0;
  while (true) {
    const startFence = content.indexOf('```', cursor);
    if (startFence === -1) {
      // No more fences, append the rest
      result += content.slice(cursor);
      break;
    }
    // Append text before the fence
    result += content.slice(cursor, startFence);
    // Find end of the fence line to get the optional language
    const lineEnd = content.indexOf('\n', startFence + 3);
    const afterFence = startFence + 3;
    const fenceLineEnd = lineEnd === -1 ? content.length : lineEnd;
    const fenceLine = content.slice(afterFence, fenceLineEnd);
    const lang = fenceLine.trim();
    // Code starts after the first newline after the opening fence (or immediately if none)
    const codeStart = fenceLineEnd === content.length ? fenceLineEnd : fenceLineEnd + 1;
    // Find matching closing fence
    const endFence = content.indexOf('```', codeStart);
    if (endFence === -1) {
      // Unclosed code block; treat the rest as normal content
      result += content.slice(startFence);
      break;
    }
    const code = content.slice(codeStart, endFence);
    const language = lang || 'text';
    codeBlocks.push({
      language,
      code: code.trim()
    });
    result += `[CODE_BLOCK_${codeBlockIndex++}]`;
    // Move cursor past the closing fence
    cursor = endFence + 3;
  }
  const contentWithoutCode = result;
  const stripped = stripMarkdown(contentWithoutCode);
  
  return { stripped, codeBlocks };
}

// Extract external links from markdown
function extractLinks(content) {
  const links = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const text = match[1];
    const url = match[2];
    if (!url.startsWith('/')) { // Only external links
      links.push({ text, url });
    }
  }
  
  return links;
}

// Strip MDX/Markdown syntax to get plain text
function stripMarkdown(content) {
  return content
    // Remove import statements
    .replace(/import\s+.*?from\s+['"].*?['"];?\r?\n?/g, '')
    // Remove export statements
    .replace(/export\s+.*?;?\r?\n?/g, '')
    // Remove admonitions (:::tip, :::info, etc.) - multiline
    .replace(/:::[a-z]*[\s\S]*?:::/gi, ' ')
    // Remove JSX components and HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Replace links with just the text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images (standard markdown and MDX/JSX style)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/!\[[^\]]*\]/g, '')  // Orphaned image alt text
    // Remove markdown symbols (headers, bold, italic, etc.)
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
    .replace(/\*([^*]+)\*/g, '$1')      // Italic
    .replace(/__([^_]+)__/g, '$1')      // Bold
    .replace(/_([^_]+)_/g, '$1')        // Italic
    .replace(/~~([^~]+)~~/g, '$1')      // Strikethrough
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Remove list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Collapse multiple newlines
    .replace(/\n{2,}/g, '\n')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPages() {
  const pagesDir = path.join(__dirname, '..', 'src', 'pages');
  const pages = [];
  
  // MDX files to extract from pages directory
  const mdxFiles = ['about.mdx', 'projects.mdx', 'contact.mdx', 'sponsors.mdx'];
  
  for (const file of mdxFiles) {
    try {
      const filePath = path.join(pagesDir, file);
      if (!fs.existsSync(filePath)) {
        console.error(`Page not found: ${filePath}`);
        continue;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      const id = file.replace('.mdx', '');
      
      const strippedContent = stripMarkdown(body);
      
      pages.push({
        id: `page-${id}`,
        title: frontmatter.title || id,
        description: frontmatter.description || '',
        content: strippedContent.slice(0, 5000), // Limit content size
        url: `/${id}`,
        category: 'page',
        tags: Array.isArray(frontmatter.keywords) 
          ? frontmatter.keywords.join(', ') 
          : (frontmatter.keywords || ''),
        date: null
      });
    } catch (error) {
      console.error(`Error processing page ${file}: ${error.message}`);
      // Continue processing other files
    }
  }
  
  // Add theme park pages
  const themeParkDirs = [
    { dir: 'disney', title: 'Disney Theme Parks', url: '/disney' },
    { dir: 'universal', title: 'Universal Theme Parks', url: '/universal' }
  ];
  
  for (const park of themeParkDirs) {
    try {
      const indexPath = path.join(__dirname, '..', park.dir, 'index.mdx');
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf-8');
        const { frontmatter, body } = parseFrontmatter(content);
        
        pages.push({
          id: `page-${park.dir}`,
          title: frontmatter.title || park.title,
          description: frontmatter.description || '',
          content: stripMarkdown(body).slice(0, 5000),
          url: park.url,
          category: 'page',
          tags: '',
          date: null
        });
      }
    } catch (error) {
      console.error(`Error processing theme park page ${park.dir}: ${error.message}`);
      // Continue processing other files
    }
  }

  // Add video games section pages
  const videogamesDirs = [
    { dir: 'videogames', subdir: null, title: 'Video Games', url: '/videogames' },
    { dir: 'videogames', subdir: 'xbox', title: 'Xbox & PC', url: '/videogames/xbox' },
    { dir: 'videogames', subdir: 'playstation', title: 'PlayStation', url: '/videogames/playstation' },
    { dir: 'videogames', subdir: 'nintendo-switch', title: 'Nintendo Switch', url: '/videogames/nintendo-switch' },
    { dir: 'videogames', subdir: 'meta-quest', title: 'Meta Quest', url: '/videogames/meta-quest' }
  ];

  for (const vg of videogamesDirs) {
    try {
      const indexPath = vg.subdir
        ? path.join(__dirname, '..', vg.dir, vg.subdir, 'index.mdx')
        : path.join(__dirname, '..', vg.dir, 'index.mdx');
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf-8');
        const { frontmatter, body } = parseFrontmatter(content);
        const id = vg.subdir ? `videogames-${vg.subdir}` : 'videogames';

        pages.push({
          id: `page-${id}`,
          title: frontmatter.title || vg.title,
          description: frontmatter.description || '',
          content: stripMarkdown(body).slice(0, 5000),
          url: vg.url,
          category: 'videogames',
          tags: Array.isArray(frontmatter.keywords)
            ? frontmatter.keywords.join(', ')
            : (frontmatter.keywords || ''),
          date: null
        });
      }
    } catch (error) {
      console.error(`Error processing videogames page ${vg.subdir || vg.dir}: ${error.message}`);
    }
  }
  
  return pages;
}

function extractBlogPosts() {
  const blogDir = path.join(__dirname, '..', 'blog');
  const posts = [];
  
  if (!fs.existsSync(blogDir)) {
    console.error(`Blog directory not found: ${blogDir}`);
    return posts;
  }

  // Calculate 90-day window for "recent" flag
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  let files;
  try {
    files = fs.readdirSync(blogDir)
      .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
      .filter(f => !f.startsWith('_')) // Exclude partial files
      .sort((a, b) => {
        // Sort by date in filename descending (newest first)
        const dateA = a.match(/^(\d{4}-\d{2}-\d{2})/) ? a.substring(0, 10) : '0000-00-00';
        const dateB = b.match(/^(\d{4}-\d{2}-\d{2})/) ? b.substring(0, 10) : '0000-00-00';
        return dateB.localeCompare(dateA);
      });
  } catch (error) {
    console.error(`Error reading blog directory: ${error.message}`);
    return posts;
  }
  
  for (const file of files) {
    try {
      const filePath = path.join(blogDir, file);
      
      // Skip directories
      if (fs.statSync(filePath).isDirectory()) continue;
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      
      // Extract date from filename (YYYY-MM-DD-Title.mdx)
      const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
      const dateStr = dateMatch ? dateMatch[1] : null;
      const date = dateStr ? `${dateStr}T00:00:00Z` : null;
      
      // Calculate if post is recent (within last 90 days)
      const postDate = dateStr ? new Date(dateStr) : null;
      const isRecent = postDate && postDate >= ninetyDaysAgo;
      
      // Generate slug from filename - use frontmatter slug if available
      const slug = frontmatter.slug || file
        .replace(/^\d{4}-\d{2}-\d{2}-/, '')
        .replace(/\.mdx?$/, '')
        .toLowerCase()
        // Convert to URL-friendly slug
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      const { stripped: strippedContent, codeBlocks } = stripAndExtractCode(body);
      const externalLinks = extractLinks(body);

      // Calculate reading time (average ~200 words per minute)
      const wordMatches = strippedContent.match(/\S+/g);
      const wordCount = wordMatches ? wordMatches.length : 0;
      const readingTimeMinutes = Math.ceil(wordCount / 200);
      
      // Prepare code metadata string if there are code blocks
      const codeMetadata = codeBlocks.length > 0
        ? `Contains code examples: ${codeBlocks.map(b => b.language).join(', ')}`
        : '';
      
      // Prepare links metadata
      const linkMetadata = externalLinks.length > 0
        ? `References: ${externalLinks.slice(0, 3).map(l => l.text).join(', ')}`
        : '';
      
      const allMetadata = [codeMetadata, linkMetadata].filter(Boolean).join('. ');
      
      posts.push({
        id: `blog-${slug}`,
        title: frontmatter.title || slug,
        description: frontmatter.description || '',
        content: strippedContent.slice(0, 5000),
        url: `/blog/${slug}`,
        category: 'blog',
        tags: Array.isArray(frontmatter.tags) 
          ? frontmatter.tags.join(', ') 
          : (frontmatter.tags || ''),
        date,
        recent: isRecent,
        metadata: allMetadata,
        wordCount,
        readingTimeMinutes,
        codeLanguages: codeBlocks.length > 0 ? codeBlocks.map(b => b.language) : []
      });
    } catch (error) {
      console.error(`Error processing blog post ${file}: ${error.message}`);
      // Continue processing other files
    }
  }
  
  return posts;
}

// Main execution
try {
  const pages = extractPages();
  const blogPosts = extractBlogPosts();
  
  // Log stats to stderr (so they don't interfere with JSON output)
  console.error(`Extracted ${pages.length} pages and ${blogPosts.length} blog posts`);
  
  // Output JSON to stdout
  const payload = { pages, blogPosts };
  console.log(JSON.stringify(payload));
  
} catch (error) {
  console.error('Error extracting content:', error.message);
  process.exit(1);
}
