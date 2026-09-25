<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useApprovalStore } from "../stores/ApprovalStore";
import { useCurrentUserStore } from "../stores/CurrentUserStore";
import { useNavStore } from "../stores/NavStore";
import { SignatureRole } from "../constants/SignatureRole";
import type { SignatureRole as SignatureRoleType } from "../constants/SignatureRole";
import PhaseBadge from "../components/common/PhaseBadge.vue";
import SectionCard from "../components/common/SectionCard.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { formatDate, formatVersionTime } from "../utils/formatters";

const approvalStore = useApprovalStore();
const currentUser = useCurrentUserStore();
const nav = useNavStore();

const selectedVersionId = ref<number | null>(
  nav.params.versionId ? Number(nav.params.versionId) : null
);
const busy = ref(false);

onMounted(async () => {
  await approvalStore.load();
  if (!selectedVersionId.value && approvalStore.versions.length > 0) {
    selectedVersionId.value = approvalStore.versions[0].id;
  }
});

watch(
  () => nav.params.versionId,
  (value) => {
    if (value) selectedVersionId.value = Number(value);
  }
);

const versions = computed(() =>
  approvalStore.versions.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at))
);
const version = computed(() => approvalStore.versions.find((row) => row.id === selectedVersionId.value) ?? null);
const clauses = computed(() =>
  version.value ? approvalStore.clausesOfVersion(version.value.id) : []
);
const versionSignatures = computed(() =>
  version.value ? approvalStore.signaturesOfVersion(version.value.id) : []
);
const snapshots = computed(() =>
  version.value ? approvalStore.snapshotsOfVersion(version.value.id) : []
);

const pendingHighRiskClauses = computed(() =>
  clauses.value.filter(
    (clause) => clause.requires_signature && approvalStore.missingRolesForClause(clause.id).length > 0
  )
);

const canSubmit = computed(() => {
  if (!version.value) return false;
  if (version.value.phase === "COMPLETED") return false;
  if (version.value.phase === "DRAFT") return true;
  const latest = snapshots.value[snapshots.value.length - 1];
  return latest ? new Date(version.value.updated_at) > new Date(latest.frozen_at) : true;
});

const submitLabel = computed(() => {
  if (!version.value) return "送审";
  return version.value.phase === "DRAFT" ? "送审并冻结只读快照" : "修订后重新送审（新增一轮快照）";
});

const selectVersion = (id: number) => {
  selectedVersionId.value = id;
  approvalStore.clearFeedback();
};

const onSubmit = async () => {
  if (!version.value) return;
  busy.value = true;
  await approvalStore.submit(version.value.id, currentUser.name.trim() || "本机送审人");
  busy.value = false;
};

const onSign = async (clauseId: number, role: SignatureRoleType) => {
  if (!version.value) return;
  busy.value = true;
  // 按按钮时以所选角色身份签署；签名人姓名是唯一身份，同名在另一角色上会被服务层拒绝。
  currentUser.setRole(role);
  await approvalStore.sign(version.value.id, clauseId, role, currentUser.name, currentUser.name.trim() || "本机签署人");
  busy.value = false;
};

const onSaveClause = async (
  clauseId: number,
  patch: { heading: string; content: string; category: string }
) => {
  busy.value = true;
  await approvalStore.editClause(clauseId, patch, currentUser.name.trim() || "本机编辑人");
  busy.value = false;
};

const openSnapshot = (snapshotId: number) => nav.go("/snapshots", {
  versionId: String(version.value?.id ?? ""),
  snapshotId: String(snapshotId)
});

const auditLogs = computed(() =>
  version.value
    ? approvalStore.auditLogs.filter((log) => log.version_id === version.value?.id).slice(0, 12)
    : []
);
</script>

<template>
  <section class="approval-page">
    <div class="version-switcher">
      <label>选择审批版本
        <select :value="selectedVersionId ?? ''" @change="selectVersion(Number(($event.target as HTMLSelectElement).value))">
          <option value="" disabled>请选择</option>
          <option v-for="row in versions" :key="row.id" :value="row.id">
            {{ row.title }} · {{ row.version_label }}
          </option>
        </select>
      </label>
      <button class="btn-inline-link" @click="nav.go('/documents')">去导入新版</button>
    </div>

    <EmptyState v-if="!version" text="本机还没有草稿，先到「文档导入」导入一份新版隐私政策。" />

    <template v-else>
      <header class="panel approval-head">
        <div>
          <p class="eyebrow">审核页 · 法务与业务共同签字</p>
          <h2>{{ version.title }} <small>{{ version.version_label }}</small></h2>
          <div class="version-times">
            <PhaseBadge :phase="version.phase" />
            <span>草稿/更新时间：<time>{{ formatDate(version.updated_at) }}</time></span>
            <span>首次送审：<time>{{ formatVersionTime(version.submitted_at) }}</time></span>
            <span>会签完成：<time>{{ formatVersionTime(version.completed_at) }}</time></span>
            <span v-if="version.submission_round">已送审 {{ version.submission_round }} 轮</span>
          </div>
        </div>
        <div class="head-actions">
          <button class="btn-primary" :disabled="!canSubmit || busy" @click="onSubmit">{{ submitLabel }}</button>
          <p class="signature-hint">送审前签名入口关闭；送审后修改条款只会重置该条款，结论不牵连其他条款。</p>
        </div>
      </header>

      <p v-if="approvalStore.lastError" class="feedback feedback-error">{{ approvalStore.lastError }}</p>
      <p v-else-if="approvalStore.lastMessage" class="feedback feedback-ok">{{ approvalStore.lastMessage }}</p>

      <div class="signer-bar panel">
        <label>当前签名人
          <input v-model="currentUser.name" type="text" placeholder="输入姓名（两人不能同名顶两角色）" @change="currentUser.persist()" />
        </label>
        <label>本次默认签署身份
          <select :value="currentUser.role" @change="currentUser.setRole(($event.target as HTMLSelectElement).value as SignatureRole)">
            <option v-for="role in SignatureRole" :key="role" :value="role">{{ role === "LEGAL" ? "法务" : "业务" }}</option>
          </select>
        </label>
        <div class="missing-summary">
          <strong>待签高风险条款 {{ pendingHighRiskClauses.length }} 条</strong>
          <ul>
            <li v-for="clause in pendingHighRiskClauses" :key="clause.id">
              第 {{ clause.section_no }} 条《{{ clause.heading }}》缺：
              <em v-for="role in approvalStore.missingRolesForClause(clause.id)" :key="role">
                {{ role === "LEGAL" ? "法务" : "业务" }}
              </em>
            </li>
          </ul>
          <p v-if="pendingHighRiskClauses.length === 0" class="signature-hint">全部高风险条款两类角色均已签署。</p>
        </div>
      </div>

      <div class="snapshot-strip panel" v-if="snapshots.length">
        <h3>历史只读快照（{{ snapshots.length }}）</h3>
        <button v-for="snapshot in snapshots" :key="snapshot.id" class="snapshot-chip" @click="openSnapshot(snapshot.id)">
          第 {{ snapshot.round }} 轮 · 冻结于 {{ formatDate(snapshot.frozen_at) }}
        </button>
      </div>

      <div class="clause-list">
        <SectionCard
          v-for="clause in clauses"
          :key="clause.id"
          :clause="clause"
          :signatures="versionSignatures"
          :phase="version.phase"
          :current-user-name="currentUser.name"
          :current-user-role="currentUser.role"
          :submitting="busy"
          @sign="(role) => onSign(clause.id, role)"
          @save="(patch) => onSaveClause(clause.id, patch)"
        />
      </div>

      <section class="panel audit-panel">
        <h3>操作留痕（本机）</h3>
        <ul>
          <li v-for="log in auditLogs" :key="log.id">
            <time>{{ formatDate(log.created_at) }}</time>
            <span class="audit-operator">{{ log.operator }}</span>
            <span>{{ log.detail }}</span>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>
