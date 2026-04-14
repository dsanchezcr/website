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
import { resolve, join, basename } from 'path';

// Azure Blob Storage upload support (optional)
let blobUploadAvailable = false;
let BlobServiceClient;
const BLOB_CONTAINER = 'images';
const BLOB_BASE_URL = 'https://dsanchezcrwebsite.blob.core.windows.net/images';
const storageConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage;

try {
  ({ BlobServiceClient } = await import('@azure/storage-blob'));
  if (storageConnectionString) {
    blobUploadAvailable = true;
  }
} catch {
  // @azure/storage-blob not installed — skip blob upload
}

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

// Validate slug to prevent path traversal (must be YYYY-MM-DD-kebab-title format)
if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/.test(slug)) {
  console.error(`Error: Invalid slug format: "${slug}"`);
  console.error('Slug must match YYYY-MM-DD-kebab-title (e.g., "2026-04-01-my-post"). No path separators or uppercase letters.');
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
// Sanitize --filename: strip directory components and allow only safe characters
let imgBaseName;
if (filename) {
  const safeBase = basename(filename).replace(/\.[^.]+$/, '');
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(safeBase)) {
    console.error(`Error: Invalid filename (sanitized to): "${safeBase}"`);
    console.error('Filename must consist only of alphanumeric characters, hyphens, and underscores.');
    process.exit(1);
  }
  imgBaseName = safeBase;
} else {
  imgBaseName = slug.replace(/^\d{4}-\d{2}-\d{2}-/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

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
          text: `Generate an image: ${prompt}. The image must be in wide 16:9 aspect ratio (rectangular landscape, significantly wider than tall), suitable for a blog hero banner. Use a bright, clean, modern illustration style with light backgrounds and vibrant accent colors. Avoid dark or moody palettes. Include rich detail and depth in the composition. Do not include any text or words in the image.`
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

  // Use the actual mimeType from the response to determine the file extension
  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
  const ext = extMap[mimeType] || '.png';
  const imgName = `${imgBaseName}${ext}`;
  const outputPath = join(imgDir, imgName);

  const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
  writeFileSync(outputPath, buffer);
  console.log(`Image saved locally: ${outputPath} (${(buffer.length / 1024).toFixed(0)}KB, ${mimeType})`);

  // Upload to Azure Blob Storage if configured
  const blobPath = `blog/${slug}/${imgName}`;
  let uploadSucceeded = false;
  if (blobUploadAvailable) {
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(storageConnectionString);
      const containerClient = blobServiceClient.getContainerClient(BLOB_CONTAINER);
      const blockBlobClient = containerClient.getBlockBlobClient(blobPath);
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: mimeType,
          blobCacheControl: 'public, max-age=31536000, immutable',
        },
      });
      console.log(`Uploaded to Azure Blob Storage: ${BLOB_BASE_URL}/${blobPath}`);
      uploadSucceeded = true;
    } catch (err) {
      console.warn(`Warning: Azure Blob upload failed: ${err.message}`);
      console.warn('Image saved locally only. Upload manually or re-run with valid storage credentials.');
    }
  } else {
    console.log('Azure Blob Storage not configured — image saved locally only.');
    console.log('Set AZURE_STORAGE_CONNECTION_STRING in .env.local to enable automatic upload.');
  }

  // Output the frontmatter image URL
  if (uploadSucceeded) {
    const frontmatterUrl = `${BLOB_BASE_URL}/${blobPath}`;
    console.log(`\nFrontmatter image URL:\n  image: ${frontmatterUrl}`);
  } else {
    console.log(`\nFrontmatter image URL (local path — upload to Azure Blob to get a public URL):\n  image: pathname:///img/blog/${slug}/${imgName}`);
    console.log('To upload manually: az storage blob upload --account-name dsanchezcrwebsite --container-name images --file ' + outputPath + ' --name ' + blobPath);
  }
}

generateImage().catch((err) => {
  console.error('Failed to generate image:', err.message);
  process.exit(1);
});
