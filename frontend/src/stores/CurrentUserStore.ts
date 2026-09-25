import { defineStore } from "pinia";
import { STORAGE_KEYS } from "../constants/storageKeys";
import type { SignatureRole } from "../constants/SignatureRole";

// 当前签名人：姓名是"同一人不能顶两个角色"的判定依据；
// 角色只是打开审核页时默认选中的签署身份，两个人可以在同一台机器上切换。
interface CurrentUserState {
  name: string;
  role: SignatureRole;
}

function readUser(): CurrentUserState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.currentUser);
    if (raw) return { name: "", role: "LEGAL", ...(JSON.parse(raw) as Partial<CurrentUserState>) };
  } catch {
    // 本机存储损坏时退回未登录态，由页面要求填写姓名。
  }
  return { name: "", role: "LEGAL" };
}

export const useCurrentUserStore = defineStore("currentUser", {
  state: () => readUser(),
  actions: {
    setName(name: string) {
      this.name = name;
      this.persist();
    },
    setRole(role: SignatureRole) {
      this.role = role;
      this.persist();
    },
    persist() {
      localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify({ name: this.name, role: this.role }));
    }
  }
});
