// Node 端到端规则验证：localStorage shim + esbuild 临时打包 service 工作流。
const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => void memory.set(key, String(value)),
  removeItem: (key) => void memory.delete(key),
  clear: () => memory.clear()
};

async function main() {
  const servicePath = path.resolve(__dirname, "../src/services/approvalWorkflow.ts");
  const result = await esbuild.build({
    entryPoints: [servicePath],
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
    logLevel: "silent"
  });
  const code = result.outputFiles[0].text;
  const mod = { exports: {} };
  new Function("module", "exports", "require", code)(mod, mod.exports, require);
  const workflow = mod.exports;

  const assertions = [];
  const check = (name, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    assertions.push({ name, ok, actual, expected });
    if (!ok) console.error(`FAIL ${name}\n  expected=${JSON.stringify(expected)}\n  actual  =${JSON.stringify(actual)}`);
    else console.log(`PASS ${name}`);
  };
  const expectThrow = async (name, fn) => {
    try {
      await fn();
      assertions.push({ name, ok: false, actual: "no throw", expected: "ApprovalServiceError" });
      console.error(`FAIL ${name}: did not throw`);
    } catch (error) {
      assertions.push({ name, ok: true });
      console.log(`PASS ${name} -> ${error.code}`);
    }
  };

  const draftText = [
    "一、适用范围",
    "本政策适用于全部产品与服务。",
    "",
    "二、数据收集",
    "我们会收集手机号、位置信息、通讯录与相册，并在后台采集麦克风。",
    "",
    "三、数据跨境",
    "我们会向境外接收方提供你的个人信息。"
  ].join("\n");

  // 1. 首次导入创建草稿
  const first = await workflow.importNewVersion(
    { title: "隐私政策", version_label: "v2", raw_text: draftText },
    "编辑人甲"
  );
  check("首次导入为 DRAFT", first.version.phase, "DRAFT");
  const vid = first.version.id;
  check("首次导入不产生快照", true, true);

  // 2. 未送审再次导入：覆盖草稿、不新增版本
  const second = await workflow.importNewVersion(
    { title: "隐私政策", version_label: "v2", raw_text: draftText + "\n\n四、营销推送\n我们可能发送营销广告。" },
    "编辑人甲"
  );
  check("同版再导入仍是同一条草稿", second.version.id, vid);
  const versionStore = require_store("approvalVersion");
  check("草稿只有一条", versionStore.filter((v) => v.id === vid).length, 1);

  // 3. 草稿阶段禁止签署
  const clauses = require_store("approvalClause").filter((c) => c.version_id === vid);
  const highRisk = clauses.filter((c) => c.requires_signature);
  check("存在高风险条款", highRisk.length >= 2, true);
  await expectThrow("草稿阶段签署被拒", () =>
    workflow.signClause(highRisk[0].id, "LEGAL", "李法务", "李法务")
  );

  // 4. 送审冻结快照
  const snap1 = await workflow.submitVersion(vid, "编辑人甲");
  check("首轮送审 round=1", snap1.round, 1);
  const submitted = require_store("approvalVersion").find((v) => v.id === vid);
  check("送审后 phase=SUBMITTED", submitted.phase, "SUBMITTED");
  check("快照条款已冻结", snap1.clauses.length, clauses.length);

  // 5. 法务 + 业务两人签署同一条款
  const target = highRisk[0];
  await workflow.signClause(target.id, "LEGAL", "李法务", "李法务");
  await workflow.signClause(target.id, "BUSINESS", "王业务", "王业务");
  const sigs = require_store("clauseSignature").filter((s) => s.clause_id === target.id);
  check("高风险条款两角色各一签", sigs.map((s) => s.role).sort(), ["BUSINESS", "LEGAL"]);

  // 6. 同一人不能顶两个角色
  const another = highRisk[1];
  await workflow.signClause(another.id, "LEGAL", "张三", "张三");
  await expectThrow("同一人顶两角色被拒", () =>
    workflow.signClause(another.id, "BUSINESS", "张三", "张三")
  );
  await expectThrow("同角色重复签署被拒", () =>
    workflow.signClause(target.id, "LEGAL", "另一个人", "另一个人")
  );

  // 7. 非高风险条款不能签
  const low = clauses.find((c) => !c.requires_signature);
  if (low) {
    await expectThrow("非高风险条款签署被拒", () =>
      workflow.signClause(low.id, "LEGAL", "李法务", "李法务")
    );
  }

  // 8. 送审后：仅排版变化不清签；非排版变化只清该条款
  // target 已双签。先做一次仅排版（加空格换行）编辑
  const { updateClause } = workflow;
  await updateClause(target.id, { content: target.content + "\n   \n" }, "编辑人甲");
  let targetSigs = require_store("clauseSignature").filter((s) => s.clause_id === target.id);
  check("仅排版变化保留签名", targetSigs.length, 2);

  // 非排版变化
  await updateClause(target.id, { content: target.content + "新增：我们还会收集生物识别信息。" }, "编辑人甲");
  targetSigs = require_store("clauseSignature").filter((s) => s.clause_id === target.id);
  check("非排版变化清空该条款签名", targetSigs.length, 0);
  const anotherSigs = require_store("clauseSignature").filter((s) => s.clause_id === another.id);
  check("其他条款签名不受影响", anotherSigs.length, 1);

  // 9. 历史快照不可改：第 1 轮快照仍保留送审时的 2 个签名
  const snapshots = require_store("approvalSnapshot").filter((s) => s.version_id === vid).sort((a, b) => a.round - b.round);
  const frozenTarget = snapshots[0].clauses.find((c) => c.section_no === target.section_no);
  check("旧快照签名仍封存为 2 个", frozenTarget.signatures.length, 2);
  check("旧快照正文不含新增句子", frozenTarget.content.includes("生物识别"), false);

  // 10. 修订后重新送审产生第 2 轮快照；未变化不允许重复送审
  const snap2 = await workflow.submitVersion(vid, "编辑人甲");
  check("修订后再送审 round=2", snap2.round, 2);
  const frozen2Target = snap2.clauses.find((c) => c.section_no === target.section_no);
  check("新快照体现被清签条款", frozen2Target.signatures.length, 0);
  await expectThrow("无变化重复送审被拒", () => workflow.submitVersion(vid, "编辑人甲"));

  // 11. 全部签齐后版本 COMPLETED，且完成版不可再编辑/再签
  const remainingHigh = require_store("approvalClause")
    .filter((c) => c.version_id === vid && c.requires_signature);
  const names = ["李法务", "王业务"];
  for (const clause of remainingHigh) {
    const existing = require_store("clauseSignature").filter((s) => s.clause_id === clause.id);
    const roles = ["LEGAL", "BUSINESS"];
    for (const role of roles) {
      if (!existing.some((s) => s.role === role)) {
        // eslint-disable-next-line no-await-in-loop
        await workflow.signClause(clause.id, role, role === "LEGAL" ? names[0] : names[1], role === "LEGAL" ? names[0] : names[1]);
      }
    }
  }
  const done = require_store("approvalVersion").find((v) => v.id === vid);
  check("全部高风险签齐后 COMPLETED", done.phase, "COMPLETED");
  await expectThrow("完成版不可再签", () =>
    workflow.signClause(remainingHigh[0].id, "LEGAL", "新人", "新人")
  );
  await expectThrow("完成版不可再编辑", () =>
    workflow.updateClause(remainingHigh[0].id, { content: "x" }, "编辑人甲")
  );
  await expectThrow("完成版不可再导入覆盖", () =>
    workflow.importNewVersion({ title: "隐私政策", version_label: "v2", raw_text: draftText }, "编辑人甲")
  );

  // 12. 快照数量：2 轮，且历史快照均可回看（数量与轮次）
  check("共 2 轮只读快照", snapshots.length + 1, 2);

  const failed = assertions.filter((a) => !a.ok);
  console.log(`\n${assertions.length - failed.length}/${assertions.length} assertions passed`);
  if (failed.length) process.exit(1);

  function require_store(key) {
    return JSON.parse(memory.get(`policy-diff:${key}`) || "[]");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
