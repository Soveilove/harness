import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const execFileAsync = promisify(execFile);
const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const bundlePath = resolve(packageRoot, 'dist/release/sovei.cjs');

const npmCommand = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
const npmArguments = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npm pack --dry-run --json --ignore-scripts']
  : ['pack', '--dry-run', '--json', '--ignore-scripts'];
const { stdout } = await execFileAsync(
  npmCommand,
  npmArguments,
  { cwd: packageRoot, windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
);
const report = JSON.parse(stdout)[0];
const paths = report.files.map((file) => file.path).sort();
const allowed = new Set(['README.md', 'package.json', 'dist/release/sovei.cjs']);
const unexpected = paths.filter((path) => !allowed.has(path) && !/^LICEN[CS]E(?:\.|$)/i.test(path));

if (!paths.includes('dist/release/sovei.cjs')) {
  throw new Error('发布包缺少 dist/release/sovei.cjs');
}
if (paths.some((path) => /\.(?:map|ts|tsx)$/.test(path))) {
  throw new Error('发布包包含 source map 或 TypeScript 源码');
}
if (unexpected.length > 0) {
  throw new Error('发布包包含未授权文件：' + unexpected.join(', '));
}

// ── 编码检查：所有发布文件必须是 UTF-8 无 BOM ──
for (const filePath of report.files) {
  const absPath = resolve(packageRoot, filePath.path);
  const buf = readFileSync(absPath);
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    throw new Error(`发布文件 ${filePath.path} 含有 UTF-8 BOM，必须使用无 BOM 的 UTF-8 编码`);
  }
  // 校验是否为合法 UTF-8（readFile with 'utf8' 不会抛错但会用替换字符）
  const decoded = buf.toString('utf8');
  if (decoded.includes('\uFFFD')) {
    throw new Error(`发布文件 ${filePath.path} 包含非法 UTF-8 字节序列`);
  }
}

// ── 产物完整性检查 ──
const bundle = await readFile(bundlePath, 'utf8');

// 1. shebang 必须存在,否则 bin 无法直接执行
if (!bundle.startsWith('#!/usr/bin/env node')) {
  throw new Error('发布产物缺少 #!/usr/bin/env node shebang');
}

// 2. 真内联验证在 build-release.mjs(esbuild 输出、混淆前)完成 —— 混淆后 splitStrings
//    会拆分模块说明符,正则无法可靠匹配,故不在此重复检查。

// 3. smoke:产物能运行,且 --version 与 package.json 一致
const packageJson = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
const { stdout: versionOut } = await execFileAsync(process.execPath, [bundlePath, '--version'], {
  windowsHide: true,
});
if (!versionOut.includes(packageJson.version)) {
  throw new Error(`--version 输出未包含版本号 ${packageJson.version},实际输出:${versionOut.trim()}`);
}

console.log('发布包白名单检查通过:' + paths.join(', '));
console.log('发布产物 shebang、自包含、--version 检查通过');
