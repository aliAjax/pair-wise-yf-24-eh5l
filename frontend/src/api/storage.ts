/** localStorage 读写封装：所有审批实体共用，缺失或损坏时回退默认值 */
const SEED_FLAG = "policy-diff:approval-seeded";

export const readStorage = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const writeStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 本机存储不可用时静默降级，保证页面仍可用
  }
};

/** 首次进入且本机无审批数据时写入演示种子，之后不再覆盖用户数据 */
export const ensureSeedStorage = (
  docsKey: string,
  seqKey: string,
  seedDocs: unknown,
  seedSequences: unknown
): void => {
  try {
    if (localStorage.getItem(SEED_FLAG)) return;
    if (!localStorage.getItem(docsKey)) {
      localStorage.setItem(docsKey, JSON.stringify(seedDocs));
      localStorage.setItem(seqKey, JSON.stringify(seedSequences));
    }
    localStorage.setItem(SEED_FLAG, "1");
  } catch {
    // 忽略存储异常
  }
};
