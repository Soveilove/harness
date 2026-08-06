import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { isBuiltin } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputFile = resolve(packageRoot, 'dist', 'release', 'sovei.cjs');
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
    // CJS bundle 中源码的 import.meta.url 不可用(esbuild 对 cjs 格式将其留空)。
    // 注入 __META_URL__ shim，使 createRequire(import.meta.url) 在 CJS 下也能正确
    // 解析到 bundle 所在路径(__filename)。源码本身保持 ESM,不受影响。
    js: "var __META_URL__ = require('url').pathToFileURL(__filename).href;",
  },
  define: {
    'import.meta.url': '__META_URL__',
  },
  platform: 'node',
  mainFields: ['module', 'main'],
  format: 'cjs',
  target: 'node14',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
});

const bundled = await readFile(outputFile, 'utf8');
// 真内联验证(esbuild 输出、混淆前字符串完整):不应残留第三方依赖的 require/import。
// CJS 产物中未内联的第三方依赖会以 require("pkg") 或 import("pkg") 出现。
// 注意:Node 内置模块(url/fs/path/fs/promises 等)会被 esbuild 以无 node: 前缀的
// require 形式输出,它们不属于"未内联的第三方依赖",必须排除。
// 漏内联在本地(node_modules 齐全)永远不报错,只有终端用户安装后运行时崩溃,这里兜住。
const externalSpecs = [...bundled.matchAll(/(?:\brequire\(|\bimport\()['"]([^'"]+)['"]/g)]
  .map((match) => match[1])
  .filter((spec) => spec && !spec.startsWith('./') && !spec.startsWith('../') && !isBuiltin(spec));
if (externalSpecs.length > 0) {
  throw new Error('bundle 包含未内联的外部依赖(应全部打包进 bundle):\n' + [...new Set(externalSpecs)].join('\n'));
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
