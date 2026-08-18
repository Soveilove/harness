import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const targetRoot = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const npmrcPath = path.join(targetRoot, '.npmrc');
const gitignorePath = path.join(targetRoot, '.gitignore');

const npmrcContent = [
    '@workec:registry=http://npm.workec.com',
    'registry=https://registry.npmmirror.com',
].join('\n') + '\n';

const requiredGitignoreEntries = [
    'build.warning.json',
    'build.error.json',
];

async function readOptionalFile(filePath) {
    try {
        return await readFile(filePath, 'utf8');
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            return '';
        }

        throw error;
    }
}

async function ensureParentDirectory(filePath) {
    await mkdir(path.dirname(filePath), { recursive: true });
}

async function updateNpmrc() {
    await ensureParentDirectory(npmrcPath);
    await writeFile(npmrcPath, npmrcContent, 'utf8');
    process.stdout.write(`已覆盖 ${npmrcPath}\n`);
}

async function updateGitignore() {
    const currentContent = await readOptionalFile(gitignorePath);
    const existingLines = new Set(currentContent.split(/\r?\n/));
    const missingEntries = requiredGitignoreEntries.filter((entry) => !existingLines.has(entry));

    if (missingEntries.length === 0) {
        process.stdout.write(`已检查 ${gitignorePath}，无需追加忽略项\n`);
        return;
    }

    const normalizedContent = currentContent.length === 0
        ? ''
        : currentContent.endsWith('\n')
            ? currentContent
            : `${currentContent}\n`;
    const nextContent = `${normalizedContent}${missingEntries.join('\n')}\n`;

    await ensureParentDirectory(gitignorePath);
    await writeFile(gitignorePath, nextContent, 'utf8');
    process.stdout.write(`已更新 ${gitignorePath}：${missingEntries.join(', ')}\n`);
}

async function main() {
    await updateNpmrc();
    await updateGitignore();
}

main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
});