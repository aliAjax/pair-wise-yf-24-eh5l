import { defineStore } from "pinia";
import { routes } from "../router/routes";

// 轻量路由：项目不引入额外路由库，导航状态集中在独立 store，页面之间禁止互相持有 state。
interface NavState {
  route: string;
  params: Record<string, string>;
}

export const useNavStore = defineStore("nav", {
  state: (): NavState => ({ route: routes[0].route, params: {} }),
  actions: {
    go(route: string, params: Record<string, string> = {}) {
      this.route = route;
      this.params = params;
    }
  }
});
