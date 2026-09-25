// 正文指纹：折叠所有空白（空格、制表、换行、全角空格）。
// 两次指纹相同 = 仅排版变化，签名继续有效；不同 = 非排版变化，需要回到待签。
export function normalizeBody(content: string): string {
  return content
    .replace(/　/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export function contentFingerprint(content: string): string {
  const normalized = normalizeBody(content);
  let hash = 5381;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return `fp_${(hash >>> 0).toString(36)}_${normalized.length}`;
}

export function isOnlyLayoutChange(before: string, after: string): boolean {
  return normalizeBody(before) === normalizeBody(after);
}
