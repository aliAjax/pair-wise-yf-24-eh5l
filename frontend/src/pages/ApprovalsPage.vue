<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useApprovalStore } from "../stores/ApprovalStore";
import ImportDraftPanel from "../components/common/ImportDraftPanel.vue";
import DocumentSnapshotCard from "../components/common/DocumentSnapshotCard.vue";
import ClauseSignPanel from "../components/common/ClauseSignPanel.vue";
import StatCard from "../components/common/StatCard.vue";
import { useApprovalReview } from "../hooks/useApprovalReview";
import { DocumentLifecycleText } from "../constants/DocumentLifecycle";
import { formatDate, formatMissingRoles } from "../utils/formatters";
import type { SignRole } from "../types/SignRole";

const store = useApprovalStore();
const { documents, selected, feedback, drafts, snapshots } = storeToRefs(store);

onMounted(() => store.load());

const selectedHistorical = computed(() => (selected.value ? store.isHistorical(selected.value) : false));
const readonlySelected = computed(
  () => !!selected.value && (selected.value.lifecycle === "DRAFT" || selectedHistorical.value)
);
/** 只有“最新一份送审快照”可以签名 */
const canSign = computed(
  () => !!selected.value && selected.value.lifecycle === "SUBMITTED" && !selectedHistorical.value
);

const review = useApprovalReview(() => selected.value);
const { clauseViews, highRiskClauses, completeClauses, pendingClauses, allSigned, totalRequiredSignatures } =
  review;

const draftText = ref("");
watch(
  selected,
  (doc) => {
    if (doc && doc.lifecycle === "DRAFT") draftText.value = doc.raw_text;
  },
  { immediate: true }
);

const lastResetNos = computed(() => feedback.value?.resetSectionNos ?? []);

const onImport = (payload: { title: string; versionLabel: string; rawText: string }) =>
  store.importDraft(payload);
const onSaveDraft = () => selected.value && store.updateDraft(selected.value.id, draftText.value);
const onSubmit = () => selected.value && store.submitDraft(selected.value.id);
const onSign = (payload: { sectionId: number; role: SignRole; signerName: string }) => {
  if (!selected.value) return;
  store.signClause({ documentId: selected.value.id, ...payload });
};
</script>

<template>
  <div class="approval-page">
    <section v-if="feedback" class="feedback" :class="feedback.type" @click="store.clearFeedback()">
      {{ feedback.message }}
      <template v-if="feedback.type === 'success' && lastResetNos.length > 0">
        ；已清签名回待签条款：{{ lastResetNos.join("、") }}
      </template>
      <span class="feedback-close">×</span>
    </section>

    <ImportDraftPanel @import="onImport" />

    <section class="metrics">
      <StatCard label="本机草稿" :value="drafts.length" />
      <StatCard label="送审快照" :value="snapshots.length" />
      <StatCard
        label="当前待签高风险条款"
        :value="selected ? pendingClauses.length : 0"
      />
    </section>

    <div class="workspace">
      <aside class="doc-list panel">
        <h2>草稿与快照</h2>
        <p v-if="documents.length === 0" class="empty-tip">还没有数据，先在上方导入新版。</p>
        <DocumentSnapshotCard
          v-for="doc in documents"
          :key="doc.id"
          :document="doc"
          :selected="selected?.id === doc.id"
          :historical="store.isHistorical(doc)"
          @select="store.select(doc.id)"
        />
      </aside>

      <section class="detail panel">
        <template v-if="selected">
          <header class="detail-head">
            <div>
              <p class="eyebrow">policy-diff · 审核页</p>
              <h2>{{ selected.title }} {{ selected.version_label }}</h2>
              <div class="version-meta">
                <span class="badge" :class="selected.lifecycle === 'DRAFT' ? 'badge-draft' : 'badge-snapshot'">
                  {{ DocumentLifecycleText[selected.lifecycle] }}{{ selected.lifecycle === "SUBMITTED" ? ` #${selected.snapshot_seq}` : "" }}
                </span>
                <span v-if="selected.lifecycle === 'DRAFT'">版本/草稿更新时间：{{ formatDate(selected.updated_at) }}</span>
                <span v-else>版本/快照时间：{{ formatDate(selected.submitted_at) }}</span>
                <span v-if="selectedHistorical" class="lock-tag">历史快照：仅可回看，不能再改</span>
              </div>
            </div>
            <div v-if="selected.lifecycle === 'DRAFT'" class="detail-actions">
              <button type="button" class="ghost" @click="onSaveDraft">保存草稿（只覆盖本机）</button>
              <button type="button" class="primary" @click="onSubmit">送审并冻结为快照</button>
            </div>
          </header>

          <div v-if="selected.lifecycle === 'SUBMITTED'" class="review-summary">
            <p>
              高风险条款 {{ highRiskClauses.length }} 条，已完成会签
              {{ completeClauses.length }} 条，待签 {{ pendingClauses.length }} 条
              （需签名 {{ totalRequiredSignatures }} 个）。
            </p>
            <p v-if="canSign && allSigned" class="all-signed">两类角色已全部签署完成。</p>
            <p v-else-if="canSign" class="pending-tip">下列条款尚缺角色签名：<strong>
              {{ pendingClauses.map((v) => `${v.section.section_no}（缺${formatMissingRoles(v.section)}）`).join("；") }}
            </strong></p>
            <p v-else-if="selectedHistorical" class="lock-tip">此为历史快照，签名与正文均已冻结，仅供回看。</p>
          </div>

          <div v-if="selected.lifecycle === 'DRAFT'" class="draft-editor">
            <p class="hint">
              草稿状态：反复编辑只覆盖本机草稿，不会产生快照。编辑保存时会按条款比对上一版正文：
              仅发生非排版变化的条款清签名回待签，其他条款结论继续有效。
            </p>
            <textarea v-model="draftText" rows="12"></textarea>
          </div>

          <div v-else class="clause-list">
            <ClauseSignPanel
              v-for="view in clauseViews"
              :key="view.section.id"
              :section="view.section"
              :readonly="!canSign"
              @sign="onSign"
            />
          </div>
        </template>

        <div v-else class="empty-detail">
          <p>从左侧选择一份草稿或送审快照。</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.approval-page { display: grid; gap: 18px; }
.feedback { position: relative; padding: 10px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.feedback.success { background: #e4efe4; color: #244b31; }
.feedback.error { background: #f6e2d6; color: #8a3b2e; }
.feedback-close { position: absolute; right: 10px; top: 6px; font-size: 16px; }
.metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.workspace { display: grid; grid-template-columns: 300px 1fr; gap: 18px; }
.panel { background: #fbfaf4; border: 1px solid #d8d6c8; border-radius: 8px; padding: 18px; }
.doc-list { display: grid; gap: 10px; align-content: start; }
.doc-list h2 { margin: 0; }
.empty-tip { font-size: 13px; color: #596257; margin: 0; }
.detail { display: grid; gap: 16px; align-content: start; }
.detail-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap; }
.version-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; color: #596257; margin-top: 8px; }
.badge-draft { background: #f3e7d2; color: #7d4d18; }
.badge-snapshot { background: #e4efe4; color: #244b31; }
.lock-tag, .lock-tip { color: #8a3b2e; font-weight: 700; }
.detail-actions { display: flex; gap: 8px; }
.primary { padding: 9px 16px; background: #223126; color: #f5f1e6; border-radius: 6px; font-weight: 700; }
.ghost { padding: 9px 16px; background: transparent; color: #223126; border: 1px solid #b8b09f; border-radius: 6px; }
.review-summary { background: #f5f1e6; border-radius: 6px; padding: 12px 14px; font-size: 13px; display: grid; gap: 4px; }
.review-summary p { margin: 0; }
.all-signed { color: #244b31; font-weight: 700; }
.pending-tip { color: #7d4d18; }
.draft-editor textarea { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #b8b09f; border-radius: 6px; font-family: inherit; font-size: 14px; line-height: 1.7; }
.hint { font-size: 12px; color: #7d4d18; margin: 0 0 8px; }
.clause-list { display: grid; gap: 12px; }
.empty-detail { color: #596257; }
@media (max-width: 900px) {
  .metrics { grid-template-columns: 1fr; }
  .workspace { grid-template-columns: 1fr; }
}
</style>
