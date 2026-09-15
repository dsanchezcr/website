const { imageDimensionsFromData } = require('image-dimensions');
const { SaxesParser } = require('saxes');

const MAX_HEADER_BYTES = 1024 * 1024;
const MAX_ICON_ENTRIES = 256;
const SUPPORTED_TYPES = 'PNG, JPEG, GIF, WebP, AVIF, HEIF/HEIC, SVG, ICO';

function imageError(message) {
  const error = new Error(message);
  error.code = 'ERR_IMAGE_DIMENSIONS';
  return error;
}

function validateDimensions(size) {
  if (!size || ![size.width, size.height].every(value =>
    Number.isFinite(value) && value > 0 && value <= 0xffffffff)) {
    throw imageError(`Unsupported or malformed image, or dimensions exceed the header budget. Supported: ${SUPPORTED_TYPES}.`);
  }
  return size;
}

function iconDimensions(bytes, totalLength) {
  const count = bytes.readUInt16LE(4);
  const directoryEnd = 6 + count * 16;
  if (count === 0 || count > MAX_ICON_ENTRIES || directoryEnd > bytes.length) {
    throw imageError('Invalid ICO directory or too many images (maximum 256).');
  }
  const images = [];
  for (let index = 0; index < count; index += 1) {
    const entry = 6 + index * 16;
    const length = bytes.readUInt32LE(entry + 8);
    const offset = bytes.readUInt32LE(entry + 12);
    if (length === 0 || offset < directoryEnd || offset + length > totalLength) {
      throw imageError('Invalid ICO image payload bounds.');
    }
    images.push({ width: bytes[entry] || 256, height: bytes[entry + 1] || 256 });
  }
  const largest = images.reduce((best, image) =>
    image.width * image.height > best.width * best.height ? image : best);
  return { ...largest, images, type: 'ico' };
}

// CSS absolute units at 96 CSS pixels per inch; relative lengths use viewBox.
function svgLength(value) {
  if (value === undefined || value.trim().endsWith('%')) return undefined;
  const match = /^([+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*(px|in|cm|mm|pt|pc)?$/.exec(value.trim());
  if (!match) throw imageError('Unsupported SVG intrinsic length. Use absolute units or a viewBox.');
  const units = { px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, pt: 96 / 72, pc: 16 };
  return Number(match[1]) * units[match[2] || 'px'];
}

function svgDimensions(bytes, totalLength) {
  if (totalLength > MAX_HEADER_BYTES) {
    throw imageError('SVG exceeds the 1 MiB parsing budget.');
  }
  const parser = new SaxesParser({ xmlns: true });
  let root;
  let depth = 0;
  parser.on('doctype', () => { throw imageError('SVG DTDs and entity declarations are unsupported.'); });
  parser.on('error', error => { throw imageError(`Invalid SVG XML: ${error.message}`); });
  parser.on('opentag', tag => {
    depth += 1;
    if (depth > 64) throw imageError('SVG exceeds the maximum nesting depth of 64.');
    if (!root) {
      if (tag.local !== 'svg' || (tag.uri && tag.uri !== 'http://www.w3.org/2000/svg')) {
        throw imageError('Unsupported XML image: expected an SVG root element.');
      }
      root = tag.attributes;
    }
  });
  parser.on('closetag', () => { depth -= 1; });
  parser.write(bytes.toString('utf8')).close();
  if (!root) throw imageError('Invalid SVG: missing root element.');
  let width = svgLength(root.width?.value);
  let height = svgLength(root.height?.value);
  if (width === undefined || height === undefined) {
    const viewBox = root.viewBox?.value.trim().split(/[\s,]+/).map(Number);
    if (!viewBox || viewBox.length !== 4 || !viewBox.every(Number.isFinite) ||
        viewBox[2] <= 0 || viewBox[3] <= 0) {
      throw imageError('SVG requires positive intrinsic dimensions or a valid viewBox.');
    }
    if (width === undefined && height === undefined) [width, height] = viewBox.slice(2);
    else if (width === undefined) width = height * viewBox[2] / viewBox[3];
    else height = width * viewBox[3] / viewBox[2];
  }
  return { width, height, type: 'svg' };
}

function readDimensions(input, totalLength = input.byteLength) {
  if (!(input instanceof Uint8Array)) throw new TypeError('Image input must be a Uint8Array or Buffer.');
  const bytes = Buffer.from(input.buffer, input.byteOffset, Math.min(input.byteLength, MAX_HEADER_BYTES));
  let size;
  if (bytes.length >= 6 && bytes.readUInt32LE(0) === 0x00010000) {
    size = iconDimensions(bytes, totalLength);
  } else if (/^[\s\uFEFF]*</.test(bytes.subarray(0, 512).toString('utf8'))) {
    size = svgDimensions(bytes, totalLength);
  } else {
    size = imageDimensionsFromData(bytes);
    if (size?.type === 'jpeg') size = { ...size, type: 'jpg' };
  }
  return validateDimensions(size);
}

module.exports = { MAX_HEADER_BYTES, imageError, readDimensions };
