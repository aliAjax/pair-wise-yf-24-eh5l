import type { PrivacyRiskLevel } from "../types/PrivacyRiskLevel";
import type { ApprovalPolicySection } from "../types/ApprovalPolicySection";
import type { ClauseSignature } from "../types/ClauseSignature";
import type { ApprovalPolicyDocument } from "../types/ApprovalPolicyDocument";
import { isHighRisk } from "../constants/riskPolicy";

/**
 * 排版归一化：仅消除排版差异，不改动任何文字/标点/数字内容。
 * - 去掉首尾空白
 * - 连续空白（空格、制表、换行、全角空格）压成单个普通空格
 * 其余字符（含中文、中英文标点、数字）一律保留，因此：
 * 只有换行/缩进/空格差异 => 排版变化；任何文字差异 => 非排版变化。
 */
export const normalizeTypographic = (content: string): string =>
  content.replace(/^[\s﻿]+|[\s﻿]+$/g, "").replace(/[\s﻿]+/g, " ");

/** 正文是否发生非排版（实质性）变化 */
export const isSubstantiveChange = (oldContent: string, newContent: string): boolean =>
  normalizeTypographic(oldContent) !== normalizeTypographic(newContent);

export interface ParsedSectionDraft {
  section_no: string;
  heading: string;
  content: string;
  risk_level: PrivacyRiskLevel;
}

/**
 * 简易条款解析：
 * 1) 以“第X条”分条；
 * 2) 条目标题行若带 [高]/[严重] 风险标记则识别风险等级，默认 MEDIUM。
 */
export const parseSectionsFromText = (rawText: string): ParsedSectionDraft[] => {
  const text = rawText.trim();
  if (!text) return [];
  const blocks = text
    .split(/\n(?=\s*第[0-9０-９一二三四五六七八九十百]+条)/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    const lineBreak = block.search(/\n/);
    const headingLine = lineBreak === -1 ? block : block.slice(0, lineBreak);
    const body = lineBreak === -1 ? "" : block.slice(lineBreak + 1).trim();
    const riskMatch = headingLine.match(/\[(低|中|高|严重)\]\s*$/);
    const riskMap: Record<string, PrivacyRiskLevel> = {
      低: "LOW",
      中: "MEDIUM",
      高: "HIGH",
      严重: "CRITICAL"
    };
    const risk_level: PrivacyRiskLevel = riskMatch ? riskMap[riskMatch[1]] : "MEDIUM";
    const heading = (riskMatch ? headingLine.slice(0, riskMatch.index).trim() : headingLine).trim();
    const noMatch = heading.match(/第[0-9０-９一二三四五六七八九十百]+条/);
    return {
      section_no: noMatch ? noMatch[0] : `条款 ${index + 1}`,
      heading: heading || `条款 ${index + 1}`,
      content: body || heading,
      risk_level
    };
  });
};

export interface BuildSectionsResult {
  sections: ApprovalPolicySection[];
  /** 因正文非排版变化而被清掉签名、回到待签的条款号 */
  resetSectionNos: string[];
}

/**
 * 用新草稿正文重建条款，并按 section_no 与上一版对齐签名：
 * - 高风险条款正文非排版变化 => 清掉该条款已有签名（回到待签）
 * - 其余条款（未变化 / 仅排版变化 / 新增）结论继续：非排版未变时沿用旧签名
 */
export const buildSectionsFromDrafts = (
  drafts: ParsedSectionDraft[],
  documentId: number,
  previousSections: ApprovalPolicySection[],
  startSectionId: number,
  startSignatureId: number
): BuildSectionsResult => {
  const previousByNo = new Map(previousSections.map((section) => [section.section_no, section]));
  const resetSectionNos: string[] = [];
  let sectionId = startSectionId;
  let signatureId = startSignatureId;

  const sections: ApprovalPolicySection[] = drafts.map((draft) => {
    sectionId += 1;
    const section: ApprovalPolicySection = {
      id: sectionId,
      document_id: documentId,
      section_no: draft.section_no,
      heading: draft.heading,
      content: draft.content,
      risk_level: draft.risk_level,
      signatures: []
    };
    const previous = previousByNo.get(draft.section_no);
    if (previous) {
      if (isSubstantiveChange(previous.content, draft.content)) {
        resetSectionNos.push(draft.section_no);
      } else {
        const carried: ClauseSignature[] = previous.signatures.map((signature) => {
          signatureId += 1;
          return {
            id: signatureId,
            section_id: section.id,
            role: signature.role,
            signer_name: signature.signer_name,
            signed_at: signature.signed_at,
            carried_from: signature.carried_from ?? signature.id
          };
        });
        section.signatures = carried;
      }
    }
    return section;
  });

  return { sections, resetSectionNos };
};

/** 统计文档高风险条款中尚缺的签名角色数（审核页汇总用） */
export const countMissingSignatures = (document: ApprovalPolicyDocument): number =>
  document.sections.reduce((sum, section) => {
    if (!isHighRisk(section.risk_level)) return sum;
    return sum + 2 - section.signatures.length;
  }, 0);
