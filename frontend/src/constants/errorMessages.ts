export const ERROR_MESSAGES = {
  AUTH_REQUIRED: "请先登录后再继续操作",
  RBAC_DENIED: "当前角色没有执行该动作的权限",
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  SNAPSHOT_READONLY: "历史快照为只读，不能再修改或补签",
  PHASE_NOT_SUBMITTED: "版本尚未送审，草稿阶段不允许签署",
  CLAUSE_NOT_HIGH_RISK: "仅高风险条款需要法务与业务会签",
  ROLE_ALREADY_SIGNED: "该角色已经签署过本条款",
  SIGNER_CONFLICT: "法务与业务必须由两名不同人员签署，同一人不能顶两个角色",
  SIGNER_NAME_REQUIRED: "请先填写当前签名人姓名",
  DRAFT_NOT_FOUND: "未找到对应的草稿版本",
  VERSION_COMPLETED: "版本已完成会签，不能再编辑或签署"
};
