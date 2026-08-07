import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface GitVerifyInput {
  workspaceRoot: string;
  baselineRevision?: string | null;
  declaredPaths: string[];
  exclusions?: string[];
}

export interface GitVerifyResult {
  status: 'verified' | 'not-a-repository' | 'baseline-unreadable' | 'command-failed' | 'uncertain';
  baselineRevision: string | null;
  changedFiles: string[];
  outOfScopeFiles: string[];
  diffSummary: string;
  error: string | null;
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
}

function inDeclaredScope(file: string, declaredPaths: string[], exclusions: string[]): boolean {
  const normalized = normalizePath(file);
  if (exclusions.some((excluded) => normalized === normalizePath(excluded))) return false;
  if (!declaredPaths.length) return false;
  return declaredPaths.some((declared) => {
    const scope = normalizePath(declared).replace(/\/$/, '');
    return normalized === scope || normalized.startsWith(scope + '/');
  });
}

async function git(args: string[], workspaceRoot: string): Promise<string> {
  const result = await execFileAsync('git', args, {
    cwd: workspaceRoot,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  return result.stdout;
}

async function readChangedFiles(workspaceRoot: string, revision: string): Promise<string[]> {
  const diffOutput = await git(['diff', '--name-only', revision, '--'], workspaceRoot);
  const tracked = diffOutput.split(/\r?\n/).map(normalizePath).filter(Boolean);
  const statusOutput = await git(['status', '--short', '--untracked-files=all'], workspaceRoot);
  const untracked = statusOutput.split(/\r?\n/).map((line) => line.slice(3)).map(normalizePath).filter(Boolean);
  return [...new Set([...tracked, ...untracked])].sort();
}

export async function getGitBaseline(workspaceRoot: string): Promise<string | null> {
  try {
    const revision = (await git(['rev-parse', 'HEAD'], workspaceRoot)).trim();
    return revision || null;
  } catch {
    return null;
  }
}

export async function verifyGitChanges(input: GitVerifyInput): Promise<GitVerifyResult> {
  try {
    const revision = input.baselineRevision ?? (await git(['rev-parse', 'HEAD'], input.workspaceRoot)).trim();
    if (!revision) {
      return { status: 'baseline-unreadable', baselineRevision: null, changedFiles: [], outOfScopeFiles: [], diffSummary: '', error: 'empty baseline revision' };
    }
    await git(['cat-file', '-e', `${revision}^{commit}`], input.workspaceRoot);
    const changedFiles = await readChangedFiles(input.workspaceRoot, revision);
    const outOfScopeFiles = changedFiles.filter((file) => !inDeclaredScope(file, input.declaredPaths, input.exclusions ?? []));
    const diffSummary = await git(['diff', '--stat', revision, '--'], input.workspaceRoot);
    return {
      status: outOfScopeFiles.length ? 'uncertain' : 'verified',
      baselineRevision: revision,
      changedFiles,
      outOfScopeFiles,
      diffSummary: diffSummary.trim(),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not a git repository/i.test(message)) {
      return { status: 'not-a-repository', baselineRevision: null, changedFiles: [], outOfScopeFiles: [], diffSummary: '', error: message };
    }
    if (/bad object|unknown revision|invalid object|not a valid object name|ambiguous argument/i.test(message)) {
      return { status: 'baseline-unreadable', baselineRevision: input.baselineRevision ?? null, changedFiles: [], outOfScopeFiles: [], diffSummary: '', error: message };
    }
    return { status: 'command-failed', baselineRevision: input.baselineRevision ?? null, changedFiles: [], outOfScopeFiles: [], diffSummary: '', error: message };
  }
}
