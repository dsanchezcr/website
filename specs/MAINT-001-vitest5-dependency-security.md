# MAINT-001: Vitest 5 and targeted npm security updates

## Scope and approval

- Date: 2026-09-15
- Status: Implemented and verified, including the explicitly approved image-size replacement. Final audits, frontend tests, coverage and production build pass; earlier findings below are historical.
- Scope: root/admin npm manifests and locks, and necessary Vitest configuration compatibility only. No application, test-file, backend, cloud, or shared-document changes.
- The user explicitly requested Vitest and coverage-v8 4.1.11 to latest stable 5.x and remediation of affected npm dependencies. Breaking changes were reviewed before implementation.

## Design

1. Upgrade `vitest` and `@vitest/coverage-v8` together to `^5.0.0`, the configured npm registry latest stable. Keep existing Vite 8 and OXC JSX behavior; use an extension-specific JSX transform and native TypeScript parsing where required. Check the new default mock clearing and stricter hoisted mocks/async assertions through tests, without weakening test assertions or skipping tests.
2. Override vulnerable `undici` copies with `^8.10.2`. Consumers use supported Agent/fetch and jsdom dispatcher APIs. Verify tests and local dispatcher behavior. This includes the late-August security fixes documented in the release.
3. Upgrade the global security override for `js-yaml` to `^5.4.1`. Existing Docusaurus data loaders use load/dump. Check current YAML data parsing; v5 defaults to YAML 1.2 and changes custom schema APIs.
4. Preserve the original `gray-matter` v3 safeLoad contract with `js-yaml: ^3.15.2`, and the installed `@11ty/gray-matter` v1 YAML 1.1 frontmatter contract with `js-yaml: ^4.3.2`. These are the latest stable patched releases of their required API lines, not arbitrary old pins. Verify timestamp and merge-key behavior.
5. Align the root Node engine declaration with the supported intersection of installed jsdom, Vitest and undici (`^22.22.2 || ^24.15.0 || >=26.0.0`). Local Node 24.20.0 qualifies; CI selects the Node 22 release line.
6. Keep unrelated direct dependencies and existing overrides unchanged. Admin audit initially has zero findings, so do not reinstall or churn its lockfile without an affected manifest change.

## Initial blocker (resolved by the approved replacement below)

`image-size` latest stable is 2.0.2 on both the configured registry and public npm. Both ICNS and JXL/HEIF advisories list no patched release. Do not invent a fixed version, suppress the audit, or apply an unreviewed substitute. Remediation requires a separately approved patched/replacement image parser outside the manifest/config-only scope, or a published upstream fix.

## Verification / acceptance

- Run root/admin npm audit and report exact before/after severity counts, including unresolved image-size propagation.
- Run frontend tests and coverage with Vitest 5. Coordinate any necessary test-file edits instead of changing other agents' files.
- Check lockfile versions, manifest ranges, YAML consumer compatibility and Node engine intersection.
- Preserve frontend analytics npm packages and all existing security features.
- Do not commit or perform cloud writes.

## Sources

- https://vitest.dev/guide/migration/
- https://github.com/vitest-dev/vitest/releases/tag/v5.0.0
- https://github.com/nodejs/undici/releases/tag/v8.10.2
- https://github.com/nodeca/js-yaml/blob/master/docs/migrate_v4_to_v5.md
- https://github.com/advisories/GHSA-2883-xcg3-v3hh
- https://github.com/advisories/GHSA-w3rx-r6r6-pgpr
- https://github.com/advisories/GHSA-5p2g-fcmc-qvqq

Registry evidence: configured https://packagefeedproxy.microsoft.io/npm/ reports Vitest/coverage 5.0.0, undici 8.10.2 and js-yaml 5.4.1. Direct public npm probes returned older Vitest/YAML tags and an undici TLS handshake failure; upstream release/security documentation corroborates the configured feed. js-yaml 5.4.2 appears in the upstream changelog but was not published in the configured registry (E404), so it is not selected.

## Verification results

- Installed: Vitest/coverage-v8 5.0.0, undici 8.10.2 (deduplicated across AI SDK and jsdom), global js-yaml 5.4.1, @11ty/gray-matter js-yaml 4.3.2. Original gray-matter is not installed; its protective ^3.15.2 override remains for the legacy API.
- Root audit: 24 findings (20 high, 4 moderate) before; 18 high after, all image-size and its Docusaurus dependents. No critical/moderate/low findings remain. No published image-size fix is available.
- Admin audit: 0 before and after; manifest and lock unchanged, no admin install performed.
- `npm test -- --reporter=dot`: 113 passed, 1 failed; 15 test files passed, 1 failed (16 total).
- `npm run test:coverage -- --reporter=dot --coverage.reportOnFailure --coverage.reporter=text`: same test counts; V8 coverage completed. Statements 67.95% (458/674), branches 61.41% (425/692), functions 63.15% (96/152), lines 69.46% (430/619).
- Remaining test failure: `src/components/MediaCard/__tests__/MediaCard.test.jsx:30` expects exact `⭐ 9.3`; the current feature component renders `IMDb ⭐ 9.3`. Flagged for the feature owner; no test-file changes or skips.
- Vitest config now uses a pre-transform only for local .js JSX; Vite natively parses .ts/.tsx. `resolve.dedupe` ensures root tests rendering admin components share React/React DOM instead of producing invalid hook calls. Vitest 5 mock-clearing defaults remain unchanged.
- Admin `npm run typecheck` and `npm run build` passed.
- Local smoke checks passed: all three repository YAML author-data files parse identically with v4/v5; frontmatter dates and merge keys retain v4 behavior; v5 load/dump round trips; both patched YAML lines reject empty merge mappings exceeding maxTotalMergeKeys; undici Agent/fetch works against a local HTTP server.
- `npm ls --depth=0`, targeted `npm ls` and `git diff --check` passed. No full root production build or cloud operation performed.
- Shared constitution/docs were not changed. Parent coordination is needed before updating the stale Vitest 3.x technology row to the approved 5.x version.

Additional configuration reference: https://vite.dev/config/shared-options#resolve-dedupe

## Approved expansion: replace vulnerable image-size (2026-09-15)

The user explicitly approved replacing the transitive parser and adding a small original local adapter, tests, and a production build verification. This supersedes the earlier image-size scope blocker. No upstream implementation will be copied.

### Selected design

- Declare the local `image-size` alias as `file:./scripts/image-size-compat` in root dependencies and override transitive copies with `$image-size`. The direct dependency ensures npm installs the local package dependencies and records the correct root-relative lockfile link. The local package has its own name `@dsanchezcr/image-size-compat`; it is not an invented patched image-size version. A file reference is necessary for an unpublished local replacement; registry dependencies retain caret ranges.
- Use maintained, dependency-free `image-dimensions ^2.5.1` for JPEG/PNG/GIF/WebP/AVIF/HEIF header parsing. Its ISO BMFF parser rejects undersized/non-advancing boxes.
- Preserve the site's SVG files with `saxes ^6.0.0`, a non-fetching XML parser already used by jsdom, and original SVG intrinsic-size conversion. Reject DTDs, excessive nesting and missing/invalid dimensions.
- Preserve the site's ICO favicon using an original bounded directory reader based on the documented ICO header layout. Check entry count, offsets, payload lengths, and select the largest image, retaining the images array.
- Implement the actual Docusaurus contract: CommonJS `require('image-size/fromFile').imageSizeFromFile(path)` returns a Promise for `{width,height,type}`. Also expose synchronous `imageSize(Uint8Array)` for direct validation. No unused upstream CLI or mutation APIs are promised.
- Bound header reads and parsing to 1 MiB. SVG must fit completely in that budget; raster files may be larger when dimensions fit within the header budget. Reject unsupported formats (including ICNS/JXL, neither used by the site) and malformed headers with explicit errors instead of undefined dimensions.
- No HTTP fetch API, XML external entities, image decoding, native addons, runtime browser bundle additions, vulnerability suppression, or copied upstream parser implementation.

### Alternatives considered

- `image-size`: latest 2.0.2 remains unpatched.
- `probe-image-size` 7.4.0: broad format support but introduces unrelated HTTP/legacy transport dependencies, unnecessary for local Docusaurus metadata.
- `sharp` 0.35.4: maintained but native image decoding/libvips is unnecessarily heavyweight for dimensions, and ICO still requires handling.
- Selected `image-dimensions` 2.5.1 plus saxes 6.0.0 and bounded original glue keeps the build-only dependency impact small.

### Expanded acceptance checks

- Root and admin npm audits return zero findings; no installed or lockfile-resolved published image-size package remains.
- Resolve and call the adapter through Docusaurus's own dependency context.
- Preserve all five real assets' previously measured dimensions: logo PNG 750x750; three SVG illustrations 800x800; ICO 48x48, with 16/32/48 variants.
- Exercise normal PNG/JPEG/GIF/WebP/AVIF/HEIF/SVG/ICO headers and malformed/truncated/oversized data, including zero-length ICNS/JXL/HEIF boxes. Run hostile tests in a child process with a parent-enforced timeout so an infinite loop cannot hang the suite.
- Full production build and frontend tests/coverage; report any unrelated feature failures without editing shared feature tests.

Sources: https://github.com/sindresorhus/image-dimensions ; https://github.com/lddubeau/saxes ; https://www.w3.org/TR/SVG2/coords.html ; https://learn.microsoft.com/en-us/previous-versions/ms997538(v=msdn.10)

## Final verification after image-size replacement

- Root `npm audit --json`: **0 vulnerabilities** at every severity (24 initially, 18 after the initial registry-package updates, now 0).
- Admin `npm audit --json`: **0 vulnerabilities**, unchanged manifest/lock and no admin install.
- Installed replacement: local `@dsanchezcr/image-size-compat` 1.0.0, `image-dimensions` 2.5.1, `saxes` 6.0.0. Docusaurus resolves the local image-size alias; `npm ls image-size image-dimensions saxes --all` reports no invalid dependencies. The published image-size tarball is absent from the lockfile.
- The direct root file alias and `$image-size` override ensure npm installs the adapter dependencies. An initial transitive-only local-link attempt was corrected; its two stale lock entries/junction were removed, and npm regenerated/validated the resulting tree. `npm ci --dry-run --ignore-scripts --no-audit --no-fund` reports up to date.
- New adapter suite: **34 tests passed**, covering both Docusaurus-resolved APIs, all five real image assets, PNG/JPEG/progressive JPEG/GIF/WebP/AVIF/HEIC/HEIF metadata, SVG dimensions and viewBox, large raster prefixes, malformed/truncated inputs, XML entities/depth, ICO bounds, and timeout-protected hostile ICNS/JXL/HEIF fixtures.
- Full `npm test -- --reporter=dot`: **167 tests passed across 19 files**. Other agents' feature-test updates are included in this count; no shared feature test was edited by this dependency task.
- Full `npm run test:coverage -- --reporter=dot --coverage.reportOnFailure --coverage.reporter=text`: **167 tests passed across 19 files**. Coverage: statements 63.92% (737/1153), branches 57.16% (662/1158), functions 57.46% (154/268), lines 65.41% (681/1041). This expanded working tree includes concurrent feature additions, so these percentages are not a like-for-like regression comparison with the initial suite.
- Adapter coverage: statements 95%, branches 93.75%, functions 92.85%, lines 98.85%.
- `npm run build`: **passed for en, es, and pt**, generating the complete production static site with the replacement installed.
- No remaining dependency-task blockers, no advisory suppression, no copied upstream parser implementation, no unrelated upgrades, no commits, and no cloud writes. Unsupported-format/metadata-budget limitations are documented in `scripts/image-size-compat/README.md`.
