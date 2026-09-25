<script setup lang="ts">
import { computed } from "vue";
import { SignatureRole, SignatureRoleText } from "../../constants/SignatureRole";
import type { SignatureRole as SignatureRoleType } from "../../constants/SignatureRole";
import type { ApprovalClause } from "../../types/ApprovalClause";
import type { ClauseSignature } from "../../types/ClauseSignature";
import type { VersionPhase } from "../../constants/VersionPhase";
import { formatDate } from "../../utils/formatters";
import { signaturesOfClause, missingRoles } from "../../utils/signatureRules";
import RoleTag from "./RoleTag.vue";

const props = defineProps<{
  clause: ApprovalClause;
  signatures: ClauseSignature[];
  phase: VersionPhase;
  currentUserName: string;
  currentUserRole: SignatureRoleType;
  submitting?: boolean;
}>();

const emitSign = defineEmits<{ (event: "sign", role: SignatureRoleType): void }>();

const clauseSignatures = computed(() => signaturesOfClause(props.clause.id, props.signatures));
const missing = computed(() => missingRoles(clauseSignatures.value));
const signatureByRole = computed(() => {
  const map = new Map<SignatureRoleType, ClauseSignature>();
  clauseSignatures.value.forEach((signature) => map.set(signature.role, signature));
  return map;
});
const canSign = computed(() => props.phase === "SUBMITTED");
</script>

<template>
  <div class="signature-panel" v-if="clause.requires_signature">
    <div class="signature-title">
      高风险条款 · 法务 / 业务双签
      <span v-if="missing.length === 0" class="badge risk-low">已会签</span>
    </div>
    <ul class="signature-list">
      <li v-for="role in SignatureRole" :key="role" class="signature-item">
        <RoleTag :role="role" :missing="missing.includes(role)" />
        <template v-if="signatureByRole.get(role)">
          <span class="signer">
            <strong>{{ signatureByRole.get(role)!.signer }}</strong>
            <time>{{ formatDate(signatureByRole.get(role)!.signed_at) }}</time>
          </span>
        </template>
        <template v-else>
          <span class="signer signer-missing">待 {{ SignatureRoleText[role] }} 签署</span>
          <button
            class="btn-sign"
            :class="role === 'LEGAL' ? 'btn-legal' : 'btn-business'"
            :disabled="!canSign || submitting || !currentUserName"
            @click="emitSign('sign', role)"
          >
            {{ currentUserRole === role ? `以${SignatureRoleText[role]}身份签署` : `切换为${SignatureRoleText[role]}并签` }}
          </button>
        </template>
      </li>
    </ul>
    <p v-if="phase === 'DRAFT'" class="signature-hint">草稿阶段不能签署，送审冻结快照后才开放会签入口。</p>
    <p v-else-if="phase === 'COMPLETED'" class="signature-hint">该版本已完成会签，条款与签名均锁定；如需修改请导入新版本重新走送审。</p>
    <p v-else-if="!currentUserName" class="signature-hint">请先在右上角填写当前签名人姓名。</p>
    <p v-else class="signature-hint">两类角色必须由两名不同人员签署，同一人不能顶两个角色。</p>
  </div>
</template>
