/**
 * Single source of truth for the package version.
 *
 * Read from package.json at runtime via createRequire. The `../../package.json`
 * path resolves correctly both in dev (this file at src/config/version.ts →
 * packages/sovei-core/) and in the bundled release (dist/release/sovei.js →
 * packages/sovei-core/), since both locations sit two levels below the
 * package root. Bumping the version only requires editing package.json.
 */
import { createRequire } from 'node:module';

const pkgRequire = createRequire(import.meta.url);
export const VERSION: string = pkgRequire('../../package.json').version;
