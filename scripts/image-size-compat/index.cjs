const { readDimensions } = require('./dimensions.cjs');

function imageSize(input) {
  return readDimensions(input);
}

module.exports = { imageSize, default: imageSize };
