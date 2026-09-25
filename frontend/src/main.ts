import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import App from "./App.vue";
import "./styles.css";
import { ensureApprovalSeed } from "./mocks/approvalSeed";

// 演示数据在 Pinia 安装前写入本机存储，页面首次 load() 即可读到草稿与历史快照。
ensureApprovalSeed();

createApp(App).use(createPinia()).use(ElementPlus).mount("#app");
