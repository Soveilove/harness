/**
 * JSON parsing helpers for state files.
 *
 * State files (redlines, change requests, knowledge, snapshots) are written
 * by this tool and read back later. A raw `JSON.parse` throws a bare
 * `SyntaxError` when the file is corrupt, which surfaces to users as an
 * unreadable stack. These wrappers rethrow with a friendly, localized message
 * that names the file so the user knows what to restore.
 */

/** Parse JSON, throwing a friendly error naming `label` when content is corrupt. */
export function parseJson(content: string, label: string): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`${label} 文件已损坏(无法解析 JSON):${(error as Error).message}`);
  }
}
