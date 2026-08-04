import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const npmCommand = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
const npmArguments = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npm pack --dry-run --json --ignore-scripts']
  : ['pack', '--dry-run', '--json', '--ignore-scripts'];
const { stdout } = await execFileAsync(
  npmCommand,
  npmArguments,
  {
    cwd: new URL('..', import.meta.url),
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  },
);
const report = JSON.parse(stdout)[0];
const paths = report.files.map((file) => file.path).sort();
const allowed = new Set(['README.md', 'package.json', 'dist/release/sovei.js']);
const unexpected = paths.filter((path) => !allowed.has(path) && !/^LICEN[CS]E(?:\.|$)/i.test(path));

if (!paths.includes('dist/release/sovei.js')) {
  throw new Error('发布包缺少 dist/release/sovei.js');
}
if (paths.some((path) => /\.(?:map|ts|tsx)$/.test(path))) {
  throw new Error('发布包包含 source map 或 TypeScript 源码');
}
if (unexpected.length > 0) {
  throw new Error('发布包包含未授权文件：' + unexpected.join(', '));
}

console.log('发布包白名单检查通过：' + paths.join(', '));
