<script setup lang="ts">
import { computed, reactive } from "vue";
import { useApprovalStore } from "../stores/ApprovalStore";
import { useCurrentUserStore } from "../stores/CurrentUserStore";
import { useNavStore } from "../stores/NavStore";
import PhaseBadge from "../components/common/PhaseBadge.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { formatDate, formatVersionTime } from "../utils/formatters";

const SAMPLE_TEXT = `一、适用范围与更新日期
本政策说明我们如何收集、使用、存储和共享你的个人信息，更新日期为2026年9月25日。

二、我们如何收集个人信息
我们会在你注册、使用服务时收集你的手机号、位置信息、通讯录与相册访问记录，并可能在后台采集你的麦克风使用情况。

三、第三方共享与委托处理
我们可能将你的个人信息共享给支付、物流等合作伙伴，并通过第三方 SDK 委托处理设备标识信息。

四、数据跨境出境
部分服务涉及向境外接收方提供你的个人信息，数据出境前将单独取得你的同意。

五、保存期限与删除
我们仅在实现目的所必需的最短期限内保存个人信息，超出保存期限后将删除或匿名化处理。

六、你的权利
你可以查阅、复制、更正、删除个人信息，撤回同意，或注销账户，也可以向我们投诉。`;

const approvalStore = useApprovalStore();
const currentUser = useCurrentUserStore();
const nav = useNavStore();

const form = reactive({
  title: "隐私政策（新版）",
  version_label: "v2026.09",
  raw_text: SAMPLE_TEXT
});

const sortedVersions = computed(() =>
  approvalStore.versions.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at))
);

const summaryOfVersion = (versionId: number) => {
  const clauses = approvalStore.clausesOfVersion(versionId);
  const highRisk = clauses.filter((clause) => clause.requires_signature);
  const signedHighRisk = highRisk.filter((clause) =>
    approvalStore.missingRolesForClause(clause.id).length === 0
  );
  return { total: clauses.length, highRisk: highRisk.length, signedHighRisk: signedHighRisk.length };
};

const submitImport = async () => {
  const operator = currentUser.name.trim() || "本机编辑人";
  await approvalStore.importVersion({ ...form }, operator);
};

const fillSample = () => {
  form.raw_text = SAMPLE_TEXT;
};

const openApproval = (versionId: number) => nav.go("/approval", { versionId: String(versionId) });
</script>

<template>
  <section class="documents-page">
    <div class="page-intro">
      <h2>导入新版隐私政策</h2>
      <p>
        未送审前反复导入同一份新版（标题 + 版本号相同）<strong>只覆盖本机草稿</strong>，不会产生快照；
        送审后才会冻结只读快照。草稿数据仅保存在当前浏览器 localStorage。
      </p>
    </div>

    <div class="workbench">
      <div class="panel wide import-panel">
        <label class="field">政策标题
          <input v-model="form.title" type="text" placeholder="例如：隐私政策（新版）" />
        </label>
        <label class="field">版本号
          <input v-model="form.version_label" type="text" placeholder="例如：v2026.09" />
        </label>
        <label class="field">新版正文（支持"一、"/"1."等标题自动分段）
          <textarea v-model="form.raw_text" rows="14"></textarea>
        </label>
        <div class="edit-actions">
          <button class="btn-primary" :disabled="approvalStore.loading" @click="submitImport">导入 / 覆盖本机草稿</button>
          <button @click="fillSample">填入示例文本</button>
        </div>
        <p v-if="approvalStore.lastError" class="feedback feedback-error">{{ approvalStore.lastError }}</p>
        <p v-else-if="approvalStore.lastMessage" class="feedback feedback-ok">{{ approvalStore.lastMessage }}</p>
      </div>

      <div class="panel">
        <h2>本机版本</h2>
        <p class="signature-hint">草稿可反复编辑；送审后形成快照，历史快照只读。</p>
        <div v-if="sortedVersions.length === 0"><EmptyState /></div>
        <article v-for="version in sortedVersions" :key="version.id" class="version-row">
          <div>
            <strong>{{ version.title }} <small>{{ version.version_label }}</small></strong>
            <div class="version-meta">
              <PhaseBadge :phase="version.phase" />
              <span v-if="version.submission_round">第 {{ version.submission_round }} 轮送审</span>
              <span>条款 {{ summaryOfVersion(version.id).total }} 条 · 高风险 {{ summaryOfVersion(version.id).highRisk }} 条 · 已签齐 {{ summaryOfVersion(version.id).signedHighRisk }}</span>
            </div>
            <time>更新于 {{ formatDate(version.updated_at) }} · 送审时间 {{ formatVersionTime(version.submitted_at) }}</time>
          </div>
          <button class="btn-inline-link" @click="openApproval(version.id)">进入审核页</button>
        </article>
      </div>
    </div>
  </section>
</template>
