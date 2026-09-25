<script setup lang="ts">
import { computed, ref } from "vue";
import { routes } from "./router/routes";
import StatusBadge from "./components/common/StatusBadge.vue";
import StatCard from "./components/common/StatCard.vue";

const active = ref<string>(routes[routes.length - 1]?.route ?? "/approvals");
const current = computed(() => routes.find((route) => route.route === active.value) ?? routes[0]);
const CurrentComponent = computed(() => current.value.component);
const isApproval = computed(() => active.value === "/approvals");
</script>

<template>
  <div class="shell">
    <aside>
      <div class="brand">隐私政策差异对比器</div>
      <nav>
        <button
          v-for="route in routes"
          :key="route.route"
          :class="{ active: active === route.route }"
          @click="active = route.route"
        >
          {{ route.name }}
        </button>
      </nav>
    </aside>
    <main class="page">
      <section class="page-head">
        <div>
          <p class="eyebrow">policy-diff</p>
          <h1>{{ current?.name }}</h1>
        </div>
        <StatusBadge :value="isApproval ? 'DRAFT / SNAPSHOT' : 'LOCAL_DATA'" />
      </section>

      <template v-if="isApproval">
        <CurrentComponent />
      </template>
      <template v-else>
        <section class="metrics">
          <StatCard label="核心模型" :value="4" />
          <StatCard label="共享枚举" :value="6" />
          <StatCard label="存储方式" value="localStorage" />
        </section>
        <section class="workbench legacy">
          <div class="panel wide">
            <h2>{{ current?.name }}</h2>
            <CurrentComponent />
            <p class="legacy-tip">差异对比模块为既有功能；隐私政策改版请前往「送审会签」。</p>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
