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
  
  let files;
  try {
    files = fs.readdirSync(blogDir)
      .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
      .filter(f => !f.startsWith('_')); // Exclude partial files
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
      const date = dateMatch ? `${dateMatch[1]}T00:00:00Z` : null;
      
      // Generate slug from filename - use frontmatter slug if available
      const slug = frontmatter.slug || file
        .replace(/^\d{4}-\d{2}-\d{2}-/, '')
        .replace(/\.mdx?$/, '')
        .toLowerCase()
        // Convert to URL-friendly slug
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      const strippedContent = stripMarkdown(body);
      
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
        date
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
