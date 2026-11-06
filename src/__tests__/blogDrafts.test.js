// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directories = [];
const locales = ['blog', 'i18n/es/docusaurus-plugin-content-blog', 'i18n/pt/docusaurus-plugin-content-blog'];
const publishedSlugs = ['implicit-published', 'published'];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createFixture() {
  const directory = mkdtempSync(path.join(tmpdir(), 'website-blog-drafts-'));
  directories.push(directory);
  const posts = [
    { slug: 'draft', flag: 'draft: true\n' },
    { slug: 'commented-draft', flag: 'draft: true # awaiting review\n' },
    { slug: 'capitalized-draft', flag: 'draft: True\n' },
    { slug: 'windows-draft', flag: 'draft: true\n', crlf: true },
    { slug: 'published', flag: 'draft: false\n' },
    { slug: 'implicit-published', flag: '' },
  ];

  for (const locale of locales) {
    const blogDirectory = path.join(directory, locale);
    mkdirSync(blogDirectory, { recursive: true });
    for (const { slug, flag, crlf } of posts) {
      const content = `---\ntitle: "${slug}"\ndescription: "Fixture"\nslug: ${slug}\nauthors: [dsanchezcr]\ntags: [Security]\n${flag}---\n\nPublished prose can discuss this setting:\n\ndraft: true\n`;
      writeFileSync(
        path.join(blogDirectory, `2026-11-05-${slug}.mdx`),
        crlf ? content.replace(/\n/g, '\r\n') : content,
      );
    }
  }
  return directory;
}

describe('unpublished blog drafts', () => {
  it('excludes drafts from the search payload without dropping published posts', () => {
    const directory = createFixture();
    mkdirSync(path.join(directory, 'scripts'));
    const script = path.join(directory, 'scripts/extract-content.js');
    copyFileSync(path.join(root, 'scripts/extract-content.js'), script);
    const result = spawnSync(process.execPath, [script], { encoding: 'utf8', timeout: 10000 });

    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).blogPosts.map(post => post.id).sort())
      .toEqual(publishedSlugs.map(slug => `blog-${slug}`));
  });

  it.each(locales)('excludes drafts from newsletter extraction for %s', locale => {
    const directory = createFixture();
    const workflow = readFileSync(path.join(root, '.github/workflows/newsletter-dispatch.yml'), 'utf8');
    const extractor = workflow.match(/^ {10}extract_posts\(\) \{[\s\S]*?^ {10}\}/m)?.[0];
    expect(extractor).toBeTruthy();

    // Execute the workflow's actual function with deterministic Git dates, without dispatching mail.
    const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-s', '--', path.join(directory, locale)], {
      input: `CUTOFF_DATE=2026-11-01\ngit() { printf '%s\\n' '2026-11-05'; }\n${extractor}\nextract_posts "$1"\n`,
      encoding: 'utf8',
      timeout: 10000,
    });

    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).map(post => post.slug).sort()).toEqual(publishedSlugs);
  });
});
