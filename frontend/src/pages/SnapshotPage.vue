<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useApprovalStore } from "../stores/ApprovalStore";
import { useNavStore } from "../stores/NavStore";
import SnapshotViewer from "../components/common/SnapshotViewer.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { formatDate } from "../utils/formatters";

const approvalStore = useApprovalStore();
const nav = useNavStore();

const selectedVersionId = ref<number | null>(nav.params.versionId ? Number(nav.params.versionId) : null);
const selectedSnapshotId = ref<number | null>(nav.params.snapshotId ? Number(nav.params.snapshotId) : null);

onMounted(async () => {
  await approvalStore.load();
  if (!selectedVersionId.value && approvalStore.versions.length > 0) {
    selectedVersionId.value = approvalStore.versions[0].id;
  }
  if (!selectedSnapshotId.value) {
    const list = selectedVersionId.value ? approvalStore.snapshotsOfVersion(selectedVersionId.value) : [];
    if (list.length) selectedSnapshotId.value = list[list.length - 1].id;
  }
});

watch(selectedVersionId, (versionId) => {
  selectedSnapshotId.value = null;
  const list = versionId ? approvalStore.snapshotsOfVersion(versionId) : [];
  if (list.length) selectedSnapshotId.value = list[list.length - 1].id;
});

const versions = computed(() =>
  approvalStore.versions.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at))
);
const snapshots = computed(() =>
  selectedVersionId.value ? approvalStore.snapshotsOfVersion(selectedVersionId.value) : []
);
const snapshot = computed(
  () => snapshots.value.find((row) => row.id === selectedSnapshotId.value) ?? null
);
</script>

<template>
  <section class="snapshots-page">
    <div class="page-intro">
      <h2>历史快照回看</h2>
      <p>快照在送审时冻结，之后仅允许查看；不能再改正文、不能补签。工作副本上的后续修订不会影响任何历史快照。</p>
    </div>

    <div class="snapshot-filters panel">
      <label>版本
        <select :value="selectedVersionId ?? ''" @change="selectedVersionId = Number(($event.target as HTMLSelectElement).value)">
          <option value="" disabled>请选择</option>
          <option v-for="row in versions" :key="row.id" :value="row.id">{{ row.title }} · {{ row.version_label }}</option>
        </select>
      </label>
      <label>送审轮次
        <select :value="selectedSnapshotId ?? ''" @change="selectedSnapshotId = Number(($event.target as HTMLSelectElement).value)">
          <option value="" disabled>暂无快照</option>
          <option v-for="row in snapshots" :key="row.id" :value="row.id">
            第 {{ row.round }} 轮 · {{ formatDate(row.frozen_at) }}
          </option>
        </select>
      </label>
      <button class="btn-inline-link" @click="nav.go('/approval')">返回审核页</button>
    </div>

    <SnapshotViewer :snapshot="snapshot" />
    <p v-if="selectedVersionId && snapshots.length === 0" class="signature-hint">
      <EmptyState text="该版本还停留在草稿阶段，尚未送审，没有只读快照。" />
    </p>
  </section>
</template>
