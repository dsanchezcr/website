# Local image-size compatibility adapter

This original build-time adapter replaces the vulnerable published `image-size`
package through the root npm override. It contains no upstream image-size code.
Its package name is `@dsanchezcr/image-size-compat`, not a fictitious patched
image-size release. Do not publish it or remove the override until an audited
upstream replacement is approved.

## Supported contract

- `require('image-size/fromFile').imageSizeFromFile(path)` returns a Promise with
  positive `width`, `height`, and `type`. This is the Docusaurus 3.10.2 API in use.
- `require('image-size').imageSize(bytes)` synchronously accepts a Uint8Array or
  Buffer. JPEG uses the upstream `jpg` type token; ICO includes its `images` list.
- File errors propagate. Unsupported formats and malformed dimensions throw an
  explicit error rather than returning undefined. No network requests occur.

`image-dimensions` handles PNG/APNG, JPEG, GIF, WebP, AVIF, and HEIF/HEIC.
`saxes` parses SVG without fetching resources; original glue handles intrinsic
sizes, absolute CSS units, and viewBox aspect ratios. ICO uses an original bounded
metadata-directory reader and chooses the largest area, without decoding pixels.
The five current local images retain their original dimensions.

## Deliberate limits

- At most 1 MiB of each file is read and parsed. Larger raster files work when
  metadata fits in that prefix; SVG documents must fit completely.
- SVG DTDs/entities and nesting deeper than 64 levels are rejected. Relative
  percentage sizes require a viewBox; font-relative units are unsupported.
- ICO directories are limited to 256 entries; all payload ranges are checked.
- ICNS, JXL, BMP, TIFF, PSD and other unlisted formats are explicitly unsupported;
  none are used by this site's current local assets. No risky fallback parser.
- This reads intrinsic dimensions, not pixel validity or EXIF orientation. The
  Docusaurus consumer only uses width/height. Unused image-size CLI, per-format
  entrypoints, concurrency setters and mutable type controls are not emulated.
- Node must support synchronous require(ESM), as enforced by the package engines.

References: [image-dimensions](https://github.com/sindresorhus/image-dimensions),
[saxes](https://github.com/lddubeau/saxes),
[SVG coordinates](https://www.w3.org/TR/SVG2/coords.html),
[ICO layout](https://learn.microsoft.com/en-us/previous-versions/ms997538(v=msdn.10)).
