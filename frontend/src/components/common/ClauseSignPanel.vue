<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ApprovalPolicySection } from "../../types/ApprovalPolicySection";
import type { SignRole } from "../../types/SignRole";
import { isHighRisk } from "../../constants/riskPolicy";
import { REQUIRED_SIGN_ROLES, SignRoleText } from "../../types/SignRole";
import { formatDate, formatRisk, missingRoles } from "../../utils/formatters";

const props = defineProps<{
  section: ApprovalPolicySection;
  /** 只读：历史快照冻结；最新送审快照可签 */
  readonly: boolean;
}>();

const emit = defineEmits<{
  (e: "sign", payload: { sectionId: number; role: SignRole; signerName: string }): void;
}>();

const highRisk = computed(() => isHighRisk(props.section.risk_level));
const missing = computed(() => missingRoles(props.section));
const signedByRole = computed(() => {
  const map = {} as Record<SignRole, { name: string; at: string; carried: boolean } | undefined>;
  for (const signature of props.section.signatures) {
    map[signature.role] = {
      name: signature.signer_name,
      at: signature.signed_at,
      carried: signature.carried_from !== null
    };
  }
  return map;
});

const selectedRole = ref<SignRole>("LEGAL");
const signerName = ref("");

watch(
  () => props.section.id,
  () => {
    signerName.value = "";
    selectedRole.value = missing.value[0] ?? "LEGAL";
  },
  { immediate: true }
);

const submit = () => {
  if (!signerName.value.trim()) return;
  emit("sign", { sectionId: props.section.id, role: selectedRole.value, signerName: signerName.value });
  signerName.value = "";
};
</script>

<template>
  <article class="clause" :class="{ pending: highRisk && missing.length > 0, done: highRisk && missing.length === 0 }">
    <header class="clause-head">
      <div>
        <span class="clause-no">{{ section.section_no }}</span>
        <strong>{{ section.heading }}</strong>
      </div>
      <span class="badge" :class="highRisk ? 'badge-risk' : 'badge-low'">
        风险：{{ formatRisk(section.risk_level) }}
      </span>
    </header>
    <pre class="clause-content">{{ section.content }}</pre>

    <div v-if="highRisk" class="sign-grid">
      <div v-for="role in REQUIRED_SIGN_ROLES" :key="role" class="sign-cell" :class="{ filled: signedByRole[role] }">
        <div class="sign-role">{{ SignRoleText[role] }}</div>
        <template v-if="signedByRole[role]">
          <div class="sign-name">{{ signedByRole[role]!.name }}</div>
          <div class="sign-time">{{ formatDate(signedByRole[role]!.at) }}</div>
          <div v-if="signedByRole[role]!.carried" class="sign-carried">沿用上一版签名</div>
        </template>
        <div v-else class="sign-missing">缺少{{ SignRoleText[role] }}签名 · 待签</div>
      </div>
    </div>
    <p v-else class="no-sign">非高风险条款，无需会签</p>

    <form v-if="highRisk && !readonly && missing.length > 0" class="sign-form" @submit.prevent="submit">
      <label>
        角色
        <select v-model="selectedRole">
          <option v-for="role in missing" :key="role" :value="role">{{ SignRoleText[role] }}（待签）</option>
        </select>
      </label>
      <label class="signer-input">
        签名人
        <input v-model="signerName" type="text" placeholder="输入姓名（同一人不能顶两个角色）" />
      </label>
      <button type="submit" class="sign-btn">签署</button>
    </form>
  </article>
</template>

<style scoped>
.clause { border: 1px solid #d8d6c8; border-radius: 8px; padding: 14px; background: #fbfaf4; display: grid; gap: 10px; }
.clause.pending { border-left: 4px solid #c26a3b; }
.clause.done { border-left: 4px solid #3f7a52; }
.clause-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.clause-no { color: #7d4d18; font-weight: 800; margin-right: 8px; }
.clause-content { white-space: pre-wrap; word-break: break-word; margin: 0; font-family: inherit; font-size: 14px; line-height: 1.7; background: #f5f1e6; padding: 10px; border-radius: 6px; }
.badge-risk { background: #f6e2d6; color: #8a3b2e; }
.badge-low { background: #e4e9e2; color: #4a5a48; }
.sign-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sign-cell { border: 1px dashed #b8b09f; border-radius: 6px; padding: 10px; }
.sign-cell.filled { border-style: solid; border-color: #3f7a52; background: #eef6ef; }
.sign-role { font-weight: 800; margin-bottom: 4px; }
.sign-name { font-size: 14px; }
.sign-time, .sign-carried { font-size: 12px; color: #596257; }
.sign-carried { color: #7d4d18; }
.sign-missing { font-size: 13px; color: #8a3b2e; font-weight: 700; }
.no-sign { margin: 0; font-size: 13px; color: #596257; }
.sign-form { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
.sign-form label { display: grid; gap: 4px; font-size: 12px; color: #596257; }
.signer-input { flex: 1; min-width: 220px; }
.sign-form select, .sign-form input { padding: 8px 10px; border: 1px solid #b8b09f; border-radius: 6px; font-size: 14px; }
.sign-btn { padding: 8px 18px; background: #223126; color: #f5f1e6; border-radius: 6px; font-weight: 700; }
@media (max-width: 760px) { .sign-grid { grid-template-columns: 1fr; } }
</style>
