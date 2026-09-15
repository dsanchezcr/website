// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Resolve through the actual consumer, not directly into the local adapter.
const require = createRequire(import.meta.url);
const docusaurusRequire = createRequire(require.resolve('@docusaurus/mdx-loader'));
const { imageSize } = docusaurusRequire('image-size');
const { imageSizeFromFile } = docusaurusRequire('image-size/fromFile');
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

// Original minimal format headers for metadata tests, not copied image assets.
function box(type, ...parts) {
  const payload = Buffer.concat(parts);
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + payload.length);
  header.write(type, 4, 'ascii');
  return Buffer.concat([header, payload]);
}

function isoImage(brand) {
  const dimensions = Buffer.alloc(12);
  dimensions.writeUInt32BE(17, 4);
  dimensions.writeUInt32BE(13, 8);
  return Buffer.concat([
    box('ftyp', Buffer.from(brand), Buffer.alloc(4), Buffer.from(brand)),
    box('meta', Buffer.alloc(4), box('iprp', box('ipco', box('ispe', dimensions)))),
  ]);
}

function pngHeader() {
  const header = Buffer.alloc(33);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(header);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12);
  header.writeUInt32BE(17, 16);
  header.writeUInt32BE(13, 20);
  header[24] = 8;
  header[25] = 2;
  return header;
}

function webpHeader() {
  const header = Buffer.alloc(30);
  header.write('RIFF');
  header.writeUInt32LE(22, 4);
  header.write('WEBPVP8X', 8);
  header.writeUInt32LE(10, 16);
  header.writeUIntLE(16, 24, 3);
  header.writeUIntLE(12, 27, 3);
  return header;
}

const jpeg = Buffer.from([255, 216, 255, 192, 0, 17, 8, 0, 13, 0, 17, 3, 1, 17, 0, 2, 17, 0, 3, 17, 0, 255, 217]);
const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.from([17, 0, 13, 0, 0, 0, 0])]);

async function temporaryImage(data) {
  const directory = await mkdtemp(path.join(tmpdir(), 'website-image-dimensions-'));
  temporaryDirectories.push(directory);
  const filename = path.join(directory, 'image');
  await writeFile(filename, data);
  return filename;
}

describe('safe image-size replacement', () => {
  it('resolves the distinct local package through Docusaurus', () => {
    expect(docusaurusRequire('image-size/package.json').name).toBe('@dsanchezcr/image-size-compat');
  });

  it.each([
    ['PNG', pngHeader(), 'png'],
    ['JPEG', jpeg, 'jpg'],
    ['progressive JPEG', Buffer.from(jpeg.map((value, index) => index === 3 ? 194 : value)), 'jpg'],
    ['GIF', gif, 'gif'],
    ['WebP', webpHeader(), 'webp'],
    ['AVIF', isoImage('avif'), 'avif'],
    ['HEIC', isoImage('heic'), 'heic'],
    ['HEIF', isoImage('mif1'), 'heic'],
  ])('reads %s metadata via buffer and asynchronous file APIs', async (_name, bytes, type) => {
    expect(imageSize(bytes)).toMatchObject({ width: 17, height: 13, type });
    expect(await imageSizeFromFile(await temporaryImage(bytes))).toMatchObject({ width: 17, height: 13, type });
  });

  it.each([
    ['logo.png', 750, 750, 'png'],
    ['home/about.svg', 800, 800, 'svg'],
    ['home/blog.svg', 800, 800, 'svg'],
    ['home/projects.svg', 800, 800, 'svg'],
    ['favicon.ico', 48, 48, 'ico'],
  ])('preserves real asset dimensions: %s', async (file, width, height, type) => {
    const filename = path.resolve('static/img', file);
    const expected = { width, height, type };
    expect(imageSize(await readFile(filename))).toMatchObject(expected);
    expect(await imageSizeFromFile(filename)).toMatchObject(expected);
  });

  it('retains the ICO variant dimensions', async () => {
    expect((await imageSizeFromFile('static/img/favicon.ico')).images).toEqual([
      { width: 16, height: 16 }, { width: 32, height: 32 }, { width: 48, height: 48 },
    ]);
  });

  it.each([
    ['<svg width="2in" height="72pt"/>', 192, 96],
    ['<svg viewBox="0 0 40 20"/>', 40, 20],
    ['<svg width="80" viewBox="0 0 40 20"/>', 80, 40],
    ['<svg height="40" viewBox="0 0 40 20"/>', 80, 40],
    ['<svg width="100%" height="100%" viewBox="0 0 40 20"/>', 40, 20],
  ])('handles SVG intrinsic dimensions: %s', (svg, width, height) => {
    expect(imageSize(Buffer.from(svg))).toEqual({ width, height, type: 'svg' });
  });

  it('accepts a Uint8Array view without reading outside its bounds', () => {
    const bytes = Buffer.concat([Buffer.alloc(7), pngHeader(), Buffer.alloc(9)]);
    expect(imageSize(new Uint8Array(bytes.buffer, bytes.byteOffset + 7, 33))).toMatchObject({ width: 17, height: 13 });
  });

  it('reads bounded metadata from a raster larger than the header budget', async () => {
    const bytes = Buffer.concat([pngHeader(), Buffer.alloc(2 * 1024 * 1024)]);
    expect(await imageSizeFromFile(await temporaryImage(bytes))).toMatchObject({ width: 17, height: 13 });
  });

  it('propagates missing file errors and rejects unsupported file contents', async () => {
    await expect(imageSizeFromFile('missing-image-file-does-not-exist')).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(imageSizeFromFile(await temporaryImage(Buffer.from('not an image')))).rejects.toMatchObject({ code: 'ERR_IMAGE_DIMENSIONS' });
  });

  it.each([
    Buffer.alloc(0), pngHeader().subarray(0, 18), Buffer.from('BM unsupported bitmap'),
    Buffer.from('<svg width="0" height="2"/>'),
    Buffer.from('<svg/>'),
    Buffer.from('<svg width="1em" height="2"/>'),
    Buffer.from('<svg viewBox="0 0 -1 2"/>'),
    Buffer.from('<svg width="1" height="1"><g></svg>'),
    Buffer.from('<html width="1" height="1"/>'),
  ])('explicitly rejects malformed or unsupported input %#', bytes => {
    expect(() => imageSize(bytes)).toThrow();
  });

  it('rejects oversized SVG, excessive nesting, and invalid ICO directories', async () => {
    const oversized = Buffer.concat([Buffer.from('<svg width="1" height="1">'), Buffer.alloc(1024 * 1024, 32), Buffer.from('</svg>')]);
    expect(() => imageSize(oversized)).toThrow(/budget/);
    await expect(imageSizeFromFile(await temporaryImage(oversized))).rejects.toThrow(/budget/);
    expect(() => imageSize(Buffer.from(`<svg width="1" height="1">${'<g>'.repeat(64)}${'</g>'.repeat(64)}</svg>`))).toThrow(/nesting/);
    for (const count of [0, 257, 65535]) {
      const ico = Buffer.alloc(6);
      ico.writeUInt16LE(1, 2);
      ico.writeUInt16LE(count, 4);
      expect(() => imageSize(ico)).toThrow(/ICO/);
    }
    const ico = await readFile('static/img/favicon.ico');
    const badOffset = Buffer.from(ico);
    badOffset.writeUInt32LE(0, 18);
    expect(() => imageSize(badOffset)).toThrow(/payload bounds/);
    const badLength = Buffer.from(ico);
    badLength.writeUInt32LE(0xffffffff, 14);
    expect(() => imageSize(badLength)).toThrow(/payload bounds/);
  });

  it('rejects hostile ICNS/JXL/HEIF fixtures without hanging the process', () => {
    const ftyp = box('ftyp', Buffer.from('heic'), Buffer.alloc(4), Buffer.from('heic'));
    const fixtures = [
      Buffer.from('69636e73000000106963303800000000', 'hex'), // ICNS entry with zero length.
      Buffer.from('0000000c4a584c200d0a870a000000006a786c63', 'hex'), // JXL container, non-advancing box.
      Buffer.concat([ftyp, Buffer.from('000000006d65746100000000', 'hex')]),
      Buffer.concat([ftyp, box('meta', Buffer.alloc(4), Buffer.from('0000000069707270', 'hex'))]),
      Buffer.concat([ftyp, box('meta', Buffer.alloc(4), box('iprp', Buffer.from('ffffffff6970636f', 'hex')))]),
      Buffer.from('ffd8ffe00000ffe00000', 'hex'),
      Buffer.from('<!DOCTYPE svg [<!ENTITY a "123"><!ENTITY b "&a;&a;&a;">]><svg width="1" height="1">&b;</svg>'),
    ];
    const script = `
      const assert = require('node:assert/strict');
      const { createRequire } = require('node:module');
      const { imageSize } = createRequire(require.resolve('@docusaurus/mdx-loader'))('image-size');
      const fixtures = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
      for (const fixture of fixtures) assert.throws(() => imageSize(Buffer.from(fixture, 'base64')));
      console.log('All hostile fixtures rejected');
    `;
    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 5000,
      input: JSON.stringify(fixtures.map(bytes => bytes.toString('base64'))),
    });
    expect(result.error, result.error?.message).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('All hostile fixtures rejected');
  }, 10000);
});
