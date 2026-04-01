#!/usr/bin/env node

/**
 * Generate a blog hero image using Google Gemini (gemini-2.5-flash-image).
 *
 * Prerequisites:
 *   - GOOGLE_AI_KEY environment variable set (from https://ai.google.dev)
 *
 * Usage:
 *   node scripts/generate-blog-image.mjs --slug "2026-04-01-MyPost" --prompt "A futuristic..."
 *   node scripts/generate-blog-image.mjs --slug "2026-04-01-MyPost" --prompt "A futuristic..." --filename "my-image.png"
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
  console.error('Usage: node scripts/generate-blog-image.mjs --slug "<date-slug>" --prompt "<image prompt>"');
  console.error('  --slug     Blog post folder name (e.g., "2026-04-01-MyPost")');
  console.error('  --prompt   Image generation prompt');
  console.error('  --filename (optional) Output filename (default: derived from slug)');
  process.exit(1);
}

const apiKey = process.env.GOOGLE_AI_KEY;
if (!apiKey) {
  console.error('Error: GOOGLE_AI_KEY environment variable is required.');
  console.error('Get a free API key from https://ai.google.dev');
  process.exit(1);
}

const model = process.env.IMAGE_GEN_MODEL || 'gemini-2.5-flash-image';

// Derive output path
const imgDir = resolve('static', 'img', 'blog', slug);
if (!existsSync(imgDir)) {
  mkdirSync(imgDir, { recursive: true });
}

// Derive base output filename (extension will be set after we know the response mimeType)
const imgBaseName = filename
  ? filename.replace(/\.[^.]+$/, '')
  : slug.replace(/^\d{4}-\d{2}-\d{2}-/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

async function generateImage() {
  console.log(`Generating image for blog post: ${slug}`);
  console.log(`Model: ${model}`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Output directory: ${imgDir}`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Generate an image: ${prompt}. The image should be wide landscape format suitable for a blog hero image. Do not include any text in the image.`
        }]
      }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT']
      }
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Gemini API error (${response.status}): ${errorBody}`);
    process.exit(1);
  }

  const result = await response.json();

  if (!result.candidates?.[0]?.content?.parts) {
    console.error('No content returned from Gemini API.');
    console.error('Response:', JSON.stringify(result, null, 2));
    process.exit(1);
  }

  // Find the image part in the response
  const imagePart = result.candidates[0].content.parts.find(p => p.inlineData);
  if (!imagePart) {
    console.error('No image generated. Response parts:');
    for (const p of result.candidates[0].content.parts) {
      if (p.text) console.error(`  Text: ${p.text}`);
    }
    process.exit(1);
  }

  // Derive file extension from the actual mimeType returned by the API
  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  const extMap = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' };
  const ext = extMap[mimeType] || '.png';
  const imgName = `${imgBaseName}${ext}`;
  const outputPath = join(imgDir, imgName);

  const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
  writeFileSync(outputPath, buffer);
  console.log(`Image saved to: ${outputPath} (${(buffer.length / 1024).toFixed(0)}KB, ${mimeType})`);

  // Output the frontmatter image URL for easy copy
  const frontmatterUrl = `https://raw.githubusercontent.com/dsanchezcr/website/refs/heads/main/static/img/blog/${slug}/${imgName}`;
  console.log(`\nFrontmatter image URL:\n  image: ${frontmatterUrl}`);
}

generateImage().catch((err) => {
  console.error('Failed to generate image:', err.message);
  process.exit(1);
});
