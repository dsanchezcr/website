const { open } = require('node:fs/promises');
const { MAX_HEADER_BYTES, imageError, readDimensions } = require('./dimensions.cjs');

async function imageSizeFromFile(filePath) {
  const file = await open(filePath, 'r');
  try {
    const stats = await file.stat();
    if (!stats.isFile() || !Number.isSafeInteger(stats.size)) {
      throw imageError('Image path must identify a regular file of a supported size.');
    }
    const header = Buffer.alloc(Math.min(stats.size, MAX_HEADER_BYTES));
    let length = 0;
    while (length < header.length) {
      const { bytesRead } = await file.read(header, length, header.length - length, length);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    return readDimensions(header.subarray(0, length), length < header.length ? length : stats.size);
  } finally {
    await file.close();
  }
}

module.exports = { imageSizeFromFile };
