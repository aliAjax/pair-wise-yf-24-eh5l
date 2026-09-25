export type LineDiffOp = "ADDED" | "REMOVED" | "UNCHANGED";

export interface LineDiffRow {
  op: LineDiffOp;
  text: string;
}

// 基于 LCS 的行级对比，供"仅排版变化 vs 非排版变化"在页面上给出可视化旁证。
function buildLcs(a: string[], b: string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}

export function diffLines(before: string, after: string): LineDiffRow[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const table = buildLcs(a, b);
  const rows: LineDiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ op: "UNCHANGED", text: a[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      rows.push({ op: "REMOVED", text: a[i] });
      i += 1;
    } else {
      rows.push({ op: "ADDED", text: b[j] });
      j += 1;
    }
  }
  while (i < a.length) rows.push({ op: "REMOVED", text: a[i++] });
  while (j < b.length) rows.push({ op: "ADDED", text: b[j++] });
  return rows;
}

export function useTextDiff() {
  return { diff: diffLines };
}
