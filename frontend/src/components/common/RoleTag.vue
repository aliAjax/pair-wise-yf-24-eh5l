<script setup lang="ts">
import type { SignatureRole } from "../../constants/SignatureRole";
import { SignatureRoleText } from "../../constants/SignatureRole";

defineProps<{ role: SignatureRole; missing?: boolean }>();
</script>

<template>
  <span class="role-tag" :class="['role-' + role.toLowerCase(), { 'role-missing': missing }]">
    {{ SignatureRoleText[role] }}<em v-if="missing">·缺签</em>
  </span>
</template>
