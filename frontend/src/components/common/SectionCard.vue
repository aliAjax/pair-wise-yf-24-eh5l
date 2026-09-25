<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import type { ApprovalClause } from "../../types/ApprovalClause";
import type { ClauseSignature } from "../../types/ClauseSignature";
import type { VersionPhase } from "../../constants/VersionPhase";
import type { SignatureRole } from "../../constants/SignatureRole";
import RiskTag from "./RiskTag.vue";
import SignaturePanel from "./SignaturePanel.vue";
import { diffLines } from "../../hooks/useTextDiff";
import { isOnlyLayoutChange } from "../../utils/fingerprint";

const props = defineProps<{
  clause: ApprovalClause;
  signatures: ClauseSignature[];
  phase: VersionPhase;
  currentUserName: string;
  currentUserRole: SignatureRole;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  (event: "sign", role: SignatureRole): void;
  (event: "save", patch: { heading: string; content: string; category: string }): void;
}>();

const editing = ref(false);
const form = reactive({ heading: "", content: "", category: "" });
const originalContent = ref("");

watch(
  () => props.clause,
  (clause) => {
    form.heading = clause.heading;
    form.content = clause.content;
    form.category = clause.category;
  },
  { immediate: true }
);

const startEdit = () => {
  originalContent.value = props.clause.content;
  form.heading = props.clause.heading;
  form.content = props.clause.content;
  form.category = props.clause.category;
  editing.value = true;
};

const cancelEdit = () => {
  editing.value = false;
};

const previewLines = ref<ReturnType<typeof diffLines>>([]);
const layoutOnly = ref(true);
watch(
  () => form.content,
  (value) => {
    layoutOnly.value = isOnlyLayoutChange(originalContent.value, value);
    previewLines.value = layoutOnly.value ? [] : diffLines(originalContent.value, value);
  }
);
</script>

<template>
  <article class="panel clause-card" :class="{ 'clause-high-risk': clause.requires_signature }">
    <div class="clause-title">
      <span class="section-no">第 {{ clause.section_no }} 条</span>
      <template v-if="!editing"><strong>{{ clause.heading }}</strong></template>
      <RiskTag :level="clause.risk_level" />
      <span v-if="clause.requires_signature" class="badge phase-submitted">高风险 · 需会签</span>
      <span class="clause-category">{{ clause.category }}</span>
      <span v-if="!editing && phase !== 'COMPLETED'" class="btn-inline" @click="startEdit">编辑条款</span>
    </div>

    <template v-if="!editing">
      <pre class="clause-content">{{ clause.content }}</pre>
      <p v-if="clause.body_changed_at && phase === 'SUBMITTED'" class="reset-note">
        正文发生非排版变化，已有签名已清除并回到待签（其他条款结论不受影响）。
      </p>
    </template>
    <template v-else>
      <label class="field">条款标题
        <input v-model="form.heading" type="text" />
      </label>
      <label class="field">条款正文
        <textarea v-model="form.content" rows="8"></textarea>
      </label>
      <div class="diff-preview" v-if="previewLines.length">
        <p class="eyebrow">非排版变化预览（保存后仅本条款回到待签）</p>
        <div v-for="(line, index) in previewLines" :key="index" class="diff-line" :class="'diff-' + line.op.toLowerCase()">
          <span class="diff-op">{{ line.op === "UNCHANGED" ? " " : line.op === "ADDED" ? "+" : "-" }}</span>{{ line.text || " " }}
        </div>
      </div>
      <p v-else class="signature-hint">仅调整空白/换行等排版，不会清除任何已有签名。</p>
      <div class="edit-actions">
        <button class="btn-primary" :disabled="submitting" @click="emit('save', { heading: form.heading, content: form.content, category: form.category }); editing = false">
          保存覆盖{{ phase === "DRAFT" ? "草稿" : "工作副本" }}
        </button>
        <button @click="cancelEdit">取消</button>
      </div>
    </template>

    <SignaturePanel
      v-if="!editing"
      :clause="clause"
      :signatures="signatures"
      :phase="phase"
      :current-user-name="currentUserName"
      :current-user-role="currentUserRole"
      :submitting="submitting"
      @sign="(role) => emit('sign', role)"
    />
  </article>
</template>
