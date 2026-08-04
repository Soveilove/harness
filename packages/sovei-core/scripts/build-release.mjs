import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';

const packageRoot = resolve(import.meta.dirname, '..');
const outputFile = resolve(packageRoot, 'dist', 'release', 'sovei.js');
const entryFile = resolve(packageRoot, 'src', 'cli', 'index.ts');
const entrySource = (await readFile(entryFile, 'utf8')).replace(/^\uFEFF/, '');

await mkdir(resolve(packageRoot, 'dist', 'release'), { recursive: true });
await build({
  stdin: {
    contents: entrySource,
    loader: 'ts',
    resolveDir: dirname(entryFile),
    sourcefile: 'src/cli/index.ts',
  },
  outfile: outputFile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
});

const bundled = await readFile(outputFile, 'utf8');
const shebang = bundled.startsWith('#!') ? bundled.slice(0, bundled.indexOf('\n') + 1) : '#!/usr/bin/env node\n';
const body = bundled.startsWith('#!') ? bundled.slice(bundled.indexOf('\n') + 1) : bundled;
const obfuscated = JavaScriptObfuscator.obfuscate(body, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.25,
  deadCodeInjection: false,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  unicodeEscapeSequence: false,
}).getObfuscatedCode();

await writeFile(outputFile, shebang + obfuscated + '\n', 'utf8');
await chmod(outputFile, 0o755);
