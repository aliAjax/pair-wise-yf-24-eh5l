<script setup lang="ts">
import { reactive, ref } from "vue";

const SAMPLE = `第一条 总则 [高]
我们收集您的账号注册信息，包括手机号与设备标识，用于创建账户与安全风控。
第二条 信息共享 [严重]
我们可能将您的个人信息共享给第三方支付与广告合作方，范围以您授权为限。
第三条 保存期限 [高]
账号信息在账户存续期间保存，注销后三十日内删除或匿名化处理。
第四条 联系我们 [中]
如对本政策有疑问，可通过 privacy@example.com 联系我们。`;

const emit = defineEmits<{
  (e: "import", payload: { title: string; versionLabel: string; rawText: string }): void;
}>();

const form = reactive({ title: "隐私政策", versionLabel: "v2.0", rawText: SAMPLE });
const showEditor = ref(false);

const submit = () => emit("import", { ...form });
</script>

<template>
  <div class="panel import-panel">
    <h2>导入新版（草稿留本机，同版只覆盖草稿）</h2>
    <form class="import-form" @submit.prevent="submit">
      <label>政策标题<input v-model="form.title" type="text" placeholder="如：隐私政策" required /></label>
      <label>版本号<input v-model="form.versionLabel" type="text" placeholder="如：v2.0" required /></label>
      <label class="full">
        正文（按“第X条”分段，标题行可带 [低]/[中]/[高]/[严重] 风险标记）
        <textarea v-model="form.rawText" rows="10" required></textarea>
      </label>
      <div class="import-actions">
        <button type="submit" class="primary">导入/覆盖草稿</button>
        <button type="button" class="ghost" @click="form.rawText = SAMPLE">填入示例</button>
      </div>
      <p class="hint">
        规则：未送审前同一“标题+版本号”重复导入只覆盖本机草稿；送审后形成只读快照。
        条款正文发生非排版变化（改文字/标点，而非仅空格换行）时，仅清掉该条款已有签名。
      </p>
    </form>
  </div>
</template>

<style scoped>
.import-panel { background: #fbfaf4; border: 1px solid #d8d6c8; border-radius: 8px; padding: 18px; }
.import-form { display: flex; flex-wrap: wrap; gap: 12px; }
.import-form label { display: grid; gap: 4px; font-size: 12px; color: #596257; flex: 1; min-width: 180px; }
.import-form label.full { flex-basis: 100%; }
.import-form input, .import-form textarea { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #b8b09f; border-radius: 6px; font-size: 14px; font-family: inherit; }
.import-actions { flex-basis: 100%; display: flex; gap: 10px; }
.primary { padding: 9px 20px; background: #223126; color: #f5f1e6; border-radius: 6px; font-weight: 700; }
.ghost { padding: 9px 20px; background: transparent; color: #223126; border: 1px solid #b8b09f; border-radius: 6px; }
.hint { flex-basis: 100%; margin: 0; font-size: 12px; color: #7d4d18; }
</style>
