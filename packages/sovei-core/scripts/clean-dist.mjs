import { readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const distDir = resolve(import.meta.dirname, '..', 'dist');

async function removeMaps(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const target = resolve(directory, entry.name);
    if (entry.isDirectory()) await removeMaps(target);
    else if (entry.name.endsWith('.map')) await rm(target, { force: true });
  }
}

await removeMaps(distDir);
await rm(resolve(distDir, 'release'), { recursive: true, force: true });
