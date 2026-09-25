# 隐私政策差异对比器

纯前端隐私政策版本对比与风险标注工具，用户粘贴两版文本后查看条款差异、风险标签和审阅清单，数据存 localStorage。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

## 访问地址或 CLI 示例

前端：<http://localhost:20112>



## 本地开发方式

- 前端：`cd frontend && npm install && npm run dev`



## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + Element Plus + Pinia + localStorage |
| 后端 | - |
| 数据库 | 本地模拟数据 |
| 部署 | Docker Compose |

## 项目目录结构

```text
frontend/src/api, stores, types, constants, constructors, components/common, hooks, pages, router, utils, mocks
```

## 环境变量说明

- `COMPOSE_PROJECT_NAME`: Compose 项目名，默认 `policy-diff`
- `FRONTEND_PORT`: 前端端口，默认 `20112`


## Docker 部署说明

- 根 Compose 文件不写 `version`，顶层 `name: policy-diff`。
- 容器名均使用 `${COMPOSE_PROJECT_NAME:-policy-diff}` 前缀。
- 数据库使用命名卷，避免绑定中文路径。
- 常见问题：端口占用时修改 `.env` 中端口后重启；需要重置数据时执行 `docker compose down -v`。

## 枚举/常量出现位置清单

- DiffType: constants/DiffType、types/DiffType、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- PrivacyRiskLevel: constants/PrivacyRiskLevel、types/PrivacyRiskLevel、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- ReviewStatus: constants/ReviewStatus、types/ReviewStatus、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- DocumentLifecycle（DRAFT 草稿 / SUBMITTED 送审快照）: constants/DocumentLifecycle、types/DocumentLifecycle、constants/statusText、types/ApprovalPolicyDocument、services/ApprovalService、stores/ApprovalStore、components/common/DocumentSnapshotCard、pages/ApprovalsPage。
- SignRole（LEGAL 法务 / BUSINESS 业务）: constants/SignRole、types/SignRole、constants/statusText、types/ClauseSignature、utils/formatters、hooks/useApprovalReview、services/ApprovalService、components/common/ClauseSignPanel。
- ClauseSignStatus（PENDING 待签 / SIGNED 已签）: constants/ClauseSignStatus、types/ClauseSignStatus、constants/statusText、utils/formatters、hooks/useApprovalReview、components/common/ClauseSignPanel。

## 隐私政策改版会签流程（/approvals 送审会签页）

- **草稿留本机**：同一“标题+版本号”的新版在未送审前重复导入或编辑，只覆盖本机草稿（localStorage），不产生新文档。
- **送审只读快照**：点击送审后草稿冻结为只读快照（`snapshot_seq` 递增，记录送审/快照时间），正文与签名均不可再改；历史快照可回看，但禁止签名与编辑。
- **高风险条款双签**：风险等级为 HIGH/CRITICAL 的条款必须法务（LEGAL）、业务（BUSINESS）各签一次；同一签名人不能在同一条款顶两个角色，同一角色不能重复签；非高风险条款无需会签。
- **正文变化只影响该条款**：再次导入/编辑时按条款号比对，正文经排版归一化（仅忽略空格/换行/全角空格差异）后仍不同的条款才清掉已有签名回到待签；仅排版变化或未变化的条款签名沿用（界面标注“沿用上一版签名”），其他条款结论继续有效。
- **审核页信息**：展示每条款缺少的角色、签名人、签名时间，以及版本时间（草稿更新时间 / 快照送审时间）；顶部汇总待签条款与会签完成度。
- 业务规则集中在 `services/ApprovalService.ts`，由 `ApprovalController` 二次包装异常；所有写操作通过 `api/auditLog.ts` 按 `constants/logTemplates.ts` 模板留痕。测试：`cd frontend && npm test`。

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录；修改一个状态值通常需要同步类型、构造器、服务、控制器、store、页面、README 与数据库种子。

## License

MIT
