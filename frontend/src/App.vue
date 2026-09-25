<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { routes } from "./router/routes";
import { useNavStore } from "./stores/NavStore";
import { useCurrentUserStore } from "./stores/CurrentUserStore";
import DocumentsPage from "./pages/DocumentsPage.vue";
import ApprovalPage from "./pages/ApprovalPage.vue";
import SnapshotPage from "./pages/SnapshotPage.vue";
import ComparePage from "./pages/ComparePage.vue";
import RisksPage from "./pages/RisksPage.vue";
import ReviewPage from "./pages/ReviewPage.vue";

const nav = useNavStore();
const currentUser = useCurrentUserStore();

const pageMap = {
  "/documents": DocumentsPage,
  "/approval": ApprovalPage,
  "/snapshots": SnapshotPage,
  "/compare": ComparePage,
  "/risks": RisksPage,
  "/review": ReviewPage
} as const;

const currentComponent = computed(() => pageMap[nav.route as keyof typeof pageMap] ?? DocumentsPage);
const current = computed(() => routes.find((route) => route.route === nav.route) ?? routes[0]);

watchEffect(() => {
  if (currentUser.name) currentUser.persist();
});
</script>

<template>
  <div class="shell">
    <aside>
      <div class="brand">隐私政策改版<br />送审会签工作台</div>
      <nav>
        <button v-for="route in routes" :key="route.route" :class="{ active: nav.route === route.route }" @click="nav.go(route.route)">
          {{ route.name }}
        </button>
      </nav>
    </aside>
    <main class="page">
      <section class="page-head">
        <div>
          <p class="eyebrow">policy-diff · 法务 × 业务共同签字</p>
          <h1>{{ current?.name }}</h1>
        </div>
        <div class="head-user">
          <label class="user-name">
            当前签名人
            <input v-model="currentUser.name" type="text" placeholder="填写姓名" @change="currentUser.persist()" />
          </label>
          <span class="badge">数据仅存本机</span>
        </div>
      </section>
      <component :is="currentComponent" />
    </main>
  </div>
</template>
