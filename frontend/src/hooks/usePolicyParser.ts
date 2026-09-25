import { PrivacyRiskLevel } from "../constants/PrivacyRiskLevel";

export interface ParsedPolicySection {
  section_no: string;
  heading: string;
  content: string;
  category: string;
  risk_level: PrivacyRiskLevel;
}

interface KeywordRule {
  level: PrivacyRiskLevel;
  category: string;
  keywords: string[];
}

// 风险判定规则：命中关键字即视为高风险（HIGH / CRITICAL），需要法务与业务会签。
const KEYWORD_RULES: KeywordRule[] = [
  { level: "CRITICAL", category: "数据出境", keywords: ["跨境", "出境", "境外", "海外", "第三方国家"] },
  { level: "CRITICAL", category: "敏感个人信息", keywords: ["生物识别", "医疗", "健康", "金融账户", "行踪轨迹", "不满十四周岁", "未成年人"] },
  { level: "HIGH", category: "第三方共享", keywords: ["共享", "提供给", "委托处理", "SDK", "合作伙伴", "转让"] },
  { level: "HIGH", category: "数据收集", keywords: ["收集", "采集", "获取", "位置", "通讯录", "相册", "摄像头", "麦克风"] },
  { level: "HIGH", category: "保存期限", keywords: ["保存期限", "存储期限", "留存", "删除", "匿名化"] },
  { level: "MEDIUM", category: "用户权利", keywords: ["撤回同意", "查阅", "复制", "更正", "注销", "投诉"] },
  { level: "MEDIUM", category: "营销推送", keywords: ["营销", "推送", "广告", "个性化展示", "画像"] },
  { level: "LOW", category: "总则", keywords: ["适用范围", "更新日期", "生效", "联系我们"] }
];

const SECTION_HEAD = /^\s*(?:第?\s*([0-9０-９一二三四五六七八九十]+)\s*[、.．）)]?\s*)?(.{0,40})$/;

function detectRisk(heading: string, content: string): ParsedPolicySection {
  const text = `${heading}\n${content}`;
  const matched = KEYWORD_RULES.find((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
  const fallback: ParsedPolicySection = {
    section_no: "",
    heading: heading.trim() || "未命名条款",
    content,
    category: "其他",
    risk_level: PrivacyRiskLevel[1]
  };
  return matched ? { ...fallback, category: matched.category, risk_level: matched.level } : fallback;
}

// 按空行或"第 x 条 / 数字标题"切分条款；纯函数，不依赖 Vue，页面与 service 共用。
export function parsePolicyText(rawText: string): ParsedPolicySection[] {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const blocks: { heading: string; content: string }[] = [];
  let heading = "";
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (heading.trim() || content) blocks.push({ heading: heading.trim(), content });
    buffer = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    // 带编号（第 x 条 / 1. / 一、）的行一定开启新条款，即使上一条正文与它之间没有空行。
    const numberedHeading =
      /^第[一二三四五六七八九十百0-9]+条/.test(trimmed) ||
      /^[0-9０-９]+[、.．）)]/.test(trimmed) ||
      /^[一二三四五六七八九十百]+、/.test(trimmed);
    const looksLikeHeading =
      trimmed.length > 0 &&
      trimmed.length <= 40 &&
      !/[。！？；，、]$/.test(trimmed) &&
      (numberedHeading ||
        (!trimmed.includes("。") && line === trimmed && /^\s*\S/.test(line) && buffer.join("").length === 0));
    if (looksLikeHeading) {
      flush();
      heading = trimmed.replace(/^第?\s*([0-9０-９一二三四五六七八九十]+)\s*[、.．）)]?\s*/, "").trim() || trimmed;
    } else {
      buffer.push(line);
    }
  });
  flush();

  return blocks
    .map((block, index) => {
      const match = block.heading.match(SECTION_HEAD);
      const matchedNo = match?.[1] ?? String(index + 1);
      const detected = detectRisk(block.heading, block.content);
      return { ...detected, section_no: matchedNo };
    })
    .filter((section) => section.content || section.heading);
}

// 兼容 composable 形式：页面里 usePolicyParser().parse(rawText) 调用。
export function usePolicyParser() {
  return { parse: parsePolicyText };
}
