<script setup lang="ts">
import type { ApprovalPolicyDocument } from "../../types/ApprovalPolicyDocument";
import { DocumentLifecycleText } from "../../constants/DocumentLifecycle";
import { formatDate } from "../../utils/formatters";

defineProps<{
  document: ApprovalPolicyDocument;
  historical?: boolean;
  selected?: boolean;
}>();

const emit = defineEmits<{ (e: "select"): void }>();
</script>

<template>
  <button
    type="button"
    class="doc-card"
    :class="{ active: selected, historical }"
    @click="emit('select')"
  >
    <div class="doc-card-head">
      <strong>{{ document.title }}</strong>
      <span class="badge" :class="document.lifecycle === 'DRAFT' ? 'badge-draft' : 'badge-snapshot'">
        {{ DocumentLifecycleText[document.lifecycle] }}{{ document.lifecycle === "SUBMITTED" ? ` #${document.snapshot_seq}` : "" }}
      </span>
    </div>
    <div class="doc-card-meta">
      <span>版本：{{ document.version_label }}</span>
      <span v-if="document.lifecycle === 'DRAFT'">编辑时间：{{ formatDate(document.updated_at) }}</span>
      <span v-else>送审/快照时间：{{ formatDate(document.submitted_at) }}</span>
    </div>
    <p v-if="historical" class="doc-card-lock">历史快照 · 只读回看，不可再改</p>
  </button>
</template>

<style scoped>
.doc-card {
  display: grid;
  gap: 6px;
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border: 1px solid #d8d6c8;
  border-radius: 8px;
  background: #fbfaf4;
  color: #20211d;
}
.doc-card:hover { background: #f5f1e6; }
.doc-card.active { border-color: #d39b46; box-shadow: inset 0 0 0 1px #d39b46; }
.doc-card.historical { opacity: 0.78; }
.doc-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.doc-card-meta { display: grid; gap: 2px; font-size: 12px; color: #596257; }
.badge-draft { background: #f3e7d2; color: #7d4d18; }
.badge-snapshot { background: #e4efe4; color: #244b31; }
.doc-card-lock { margin: 4px 0 0; font-size: 12px; color: #8a3b2e; font-weight: 700; }
</style>
