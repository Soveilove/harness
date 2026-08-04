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
  banner: {
    // ESM bundle 内联的 CJS 依赖(如 commander)会经 esbuild 的 __require 调用内置模块,
    // 默认抛 "Dynamic require of X is not supported"。注入 createRequire 让 require 可用。
    js: "import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);",
  },
  platform: 'node',
  mainFields: ['module', 'main'],
  format: 'esm',
  target: 'node20',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
});

const bundled = await readFile(outputFile, 'utf8');
// 真内联验证(esbuild 输出、混淆前字符串完整):不应残留第三方依赖 import。
// 漏内联在本地(node_modules 齐全)永远不报错,只有终端用户安装后运行时崩溃,这里兜住。
const externalModules = [...bundled.matchAll(/\bimport\s*(?:\{[^}]*\}|\*\s*as\s+[\w$]+|[\w$]+)\s*from\s*['"]([^'"]+)['"]/g)]
  .map((match) => match[1])
  .filter((spec) => !spec.startsWith('./') && !spec.startsWith('../') && !spec.startsWith('node:'));
if (externalModules.length > 0) {
  throw new Error('bundle 包含未内联的外部依赖 import(应全部打包进 bundle):\n' + [...new Set(externalModules)].join('\n'));
}
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
