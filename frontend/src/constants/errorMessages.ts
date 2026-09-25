export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  SNAPSHOT_READONLY: "送审快照为只读，不能再修改正文",
  SIGNER_ROLE_CONFLICT: "同一签名人不能在一个条款里同时担任两个角色",
  ROLE_ALREADY_SIGNED: "该角色已经签过，不能重复签署",
  NON_HIGH_RISK_NO_SIGNATURE: "非高风险条款无需会签",
  HISTORICAL_SNAPSHOT_LOCKED: "历史快照仅可回看，不能再签名或修改"
};
