<script setup lang="ts">
import { computed } from "vue";
import { formatRisk } from "../../utils/formatters";

const props = defineProps<{ level: string }>();
const toneClass = computed(() => {
  switch (props.level) {
    case "CRITICAL":
      return "risk-critical";
    case "HIGH":
      return "risk-high";
    case "MEDIUM":
      return "risk-medium";
    default:
      return "risk-low";
  }
});
</script>

<template>
  <span class="risk-tag" :class="toneClass">{{ formatRisk(level) }}风险</span>
</template>
