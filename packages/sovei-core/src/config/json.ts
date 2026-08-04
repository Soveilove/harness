import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser';

/** Parse project-owned JSON while tolerating UTF-8 BOM, comments and trailing commas. */
export function parseProjectJson<T = unknown>(content: string, source = 'JSON'): T {
  const errors: ParseError[] = [];
  const normalized = content.replace(/^\uFEFF/, '');
  const value = parse(normalized, errors, {
    allowEmptyContent: false,
    allowTrailingComma: true,
    disallowComments: false,
  });
  if (errors.length > 0) {
    const details = errors
      .map((error) => `${printParseErrorCode(error.error)}@${error.offset}`)
      .join(', ');
    throw new Error(`无法解析 ${source}：${details}`);
  }
  return value as T;
}
