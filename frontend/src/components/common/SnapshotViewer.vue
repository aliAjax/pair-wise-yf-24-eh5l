<script setup lang="ts">
import { SignatureRole, SignatureRoleText } from "../../constants/SignatureRole";
import type { ApprovalSnapshot } from "../../types/ApprovalSnapshot";
import { formatDate } from "../../utils/formatters";
import { missingRoles } from "../../utils/signatureRules";
import RoleTag from "./RoleTag.vue";
import RiskTag from "./RiskTag.vue";
import EmptyState from "./EmptyState.vue";

defineProps<{ snapshot: ApprovalSnapshot | null }>();
</script>

<template>
  <article v-if="snapshot" class="snapshot-viewer">
    <header class="snapshot-head">
      <div>
        <p class="eyebrow">只读快照 · 第 {{ snapshot.round }} 轮送审</p>
        <h3>{{ snapshot.title }} <small>{{ snapshot.version_label }}</small></h3>
        <time>冻结时间：{{ formatDate(snapshot.frozen_at) }}</time>
      </div>
      <span class="badge">历史快照不可改、不可补签</span>
    </header>
    <div v-if="snapshot.clauses.length === 0"><EmptyState /></div>
    <section v-for="clause in snapshot.clauses" :key="clause.section_no" class="snapshot-clause">
      <div class="clause-title">
        <span class="section-no">第 {{ clause.section_no }} 条</span>
        <strong>{{ clause.heading }}</strong>
        <RiskTag :level="clause.risk_level" />
        <span v-if="clause.requires_signature" class="badge phase-submitted">需双签</span>
      </div>
      <pre class="clause-content">{{ clause.content }}</pre>
      <div v-if="clause.requires_signature" class="snapshot-signatures">
        <template v-for="role in SignatureRole" :key="role">
          <div class="snapshot-sign-row">
            <RoleTag :role="role" :missing="!clause.signatures.some((s) => s.role === role)" />
            <template v-if="clause.signatures.find((s) => s.role === role)">
              <span class="signer">
                <strong>{{ clause.signatures.find((s) => s.role === role)!.signer }}</strong>
                <time>{{ formatDate(clause.signatures.find((s) => s.role === role)!.signed_at) }}</time>
              </span>
            </template>
            <span v-else class="signer signer-missing">
              缺 {{ SignatureRoleText[role] }}（送审时未签）
            </span>
          </div>
        </template>
        <p v-if="missingRoles(clause.signatures.map((s) => ({ role: s.role, signer: s.signer }))).length === 0" class="signature-hint">冻结时该条款已双签齐全。</p>
      </div>
    </section>
  </article>
  <EmptyState v-else />
</template>
