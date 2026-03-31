#!/usr/bin/env node

/**
 * Generate a blog hero image using GitHub Models (Azure OpenAI gpt-image-1).
 *
 * Prerequisites:
 *   - GITHUB_TOKEN environment variable set (with GitHub Models access)
 *
 * Usage:
 *   node scripts/generate-blog-image.js --slug "2026-04-01-MyPost" --prompt "A futuristic..."
 *   node scripts/generate-blog-image.js --slug "2026-04-01-MyPost" --prompt "A futuristic..." --filename "my-image.png"
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// Parse CLI arguments
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const slug = getArg('slug');
const prompt = getArg('prompt');
const filename = getArg('filename');

if (!slug || !prompt) {
  console.error('Usage: node scripts/generate-blog-image.js --slug "<date-slug>" --prompt "<image prompt>"');
  console.error('  --slug     Blog post folder name (e.g., "2026-04-01-MyPost")');
  console.error('  --prompt   Image generation prompt');
  console.error('  --filename (optional) Output filename (default: derived from slug)');
  process.exit(1);
}

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Error: GITHUB_TOKEN environment variable is required for GitHub Models access.');
  process.exit(1);
}

// Derive output path
const imgDir = resolve('static', 'img', 'blog', slug);
if (!existsSync(imgDir)) {
  mkdirSync(imgDir, { recursive: true });
}

const imgName = filename || `${slug.replace(/^\d{4}-\d{2}-\d{2}-/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}.png`;
const outputPath = join(imgDir, imgName);

async function generateImage() {
  console.log(`Generating image for blog post: ${slug}`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Output: ${outputPath}`);

  const response = await fetch('https://models.github.ai/inference/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-image-1',
      prompt: prompt,
      n: 1,
      size: '1536x1024',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`GitHub Models API error (${response.status}): ${errorBody}`);
    process.exit(1);
  }

  const result = await response.json();

  if (!result.data || !result.data[0]) {
    console.error('No image returned from the API.');
    console.error('Response:', JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // The API returns base64-encoded image data or a URL
  const imageData = result.data[0];

  if (imageData.b64_json) {
    const buffer = Buffer.from(imageData.b64_json, 'base64');
    writeFileSync(outputPath, buffer);
    console.log(`Image saved to: ${outputPath} (${(buffer.length / 1024).toFixed(0)}KB)`);
  } else if (imageData.url) {
    // Download the image from URL
    const imgResponse = await fetch(imageData.url);
    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
    writeFileSync(outputPath, imgBuffer);
    console.log(`Image saved to: ${outputPath} (${(imgBuffer.length / 1024).toFixed(0)}KB)`);
  } else {
    console.error('Unexpected API response format:', JSON.stringify(imageData, null, 2));
    process.exit(1);
  }

  // Output the frontmatter image URL for easy copy
  const frontmatterUrl = `https://raw.githubusercontent.com/dsanchezcr/website/refs/heads/main/static/img/blog/${slug}/${imgName}`;
  console.log(`\nFrontmatter image URL:\n  image: ${frontmatterUrl}`);
}

generateImage().catch((err) => {
  console.error('Failed to generate image:', err.message);
  process.exit(1);
});
