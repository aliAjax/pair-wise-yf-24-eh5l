<script setup lang="ts">
import { computed } from "vue";
import type { VersionPhase } from "../../constants/VersionPhase";
import { VersionPhaseText } from "../../constants/VersionPhase";

const props = defineProps<{ phase: VersionPhase }>();
const toneClass = computed(() => `phase-${props.phase.toLowerCase()}`);
</script>

<template>
  <span class="badge phase-badge" :class="toneClass">{{ VersionPhaseText[phase] }}</span>
</template>
