# 隐私政策改版送审会签工作台

纯前端隐私政策工具：导入新版后，未送审前草稿只存在本机并可反复覆盖编辑；送审时冻结只读快照；高风险条款须法务、业务两类角色各签一次（同一人不能顶两个角色）；条款正文发生非排版变化时只重置该条款签名，其他条款结论继续有效；历史快照可回看、不能再改。数据全部存 localStorage。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

## 访问地址

前端：<http://localhost:20112>

首次打开会自动种入一份新版《隐私政策（新版）》草稿与一份已完成会签的历史版本快照，便于直接体验"草稿覆盖 → 送审 → 双角色会签 → 快照回看"。

## 本地开发方式

- 前端：`cd frontend && npm install && npm run dev`
- 规则验证脚本：`cd frontend && node scripts/verifyWorkflow.cjs`（26 条端到端断言，覆盖草稿覆盖、送审冻结、排版/非排版清签、同人双角色拒绝、完成版只读等）

## 核心业务规则

1. **草稿只在本机、反复编辑只覆盖草稿**：同一新版（标题 + 版本号相同）未送审前反复导入或编辑，只更新同一条本机草稿，不产生任何快照。
2. **送审后才形成只读快照**：每次送审冻结一轮 `ApprovalSnapshot`（条款正文与当时签名整体深拷贝封存）；送审后的修订可以继续改工作副本，再送审产生新一轮快照。
3. **高风险条款双角色会签**：风险等级 HIGH / CRITICAL 的条款必须由法务（LEGAL）与业务（BUSINESS）各签一次；同一姓名不能在同一条款顶两个角色；同一角色不可重复签。
4. **非排版变化只回退该条款**：条款保存/再导入时，用正文指纹（折叠全部空白后比较）判断是否非排版变化。仅空格/换行变化保留签名；正文变化时只清除该条款已有签名并回到待签，其他条款的签署结论继续有效。
5. **审核页展示缺角色、签名人与版本时间**：每个高风险条款列出法务/业务的缺签状态、已签人姓名、签署时间；页头展示草稿更新时间、首次送审时间、会签完成时间与送审轮次。
6. **历史快照只读**：快照页只能回看冻结正文与封存签名，没有编辑与补签入口；仓储层与服务层都会拒绝写入/补签。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + Element Plus + Pinia + localStorage |
| 后端 | 无（service 层在前端模拟业务裁决，API 层封装 localStorage 仓储） |
| 数据库 | localStorage（localRepository 统一读写） |
| 部署 | Docker Compose（Nginx 托管 SPA） |

## 项目目录结构

```text
frontend/src/
├── api/                  # 按模型分文件的 async 仓储封装（localStorage）
├── services/             # approvalWorkflow：送审/会签/清签业务规则与异常裁决
├── stores/               # Pinia 独立 store（Approval/CurrentUser/Nav + 原四个实体）
├── types/                # 数据模型与枚举类型
├── constants/            # 枚举、日志模板、错误码/错误消息、状态文案、存储键
├── constructors/         # 默认对象/表单/快照冻结构造器
├── components/common/    # PhaseBadge/RoleTag/RiskTag/SignaturePanel/SectionCard/SnapshotViewer 等
├── hooks/                # usePolicyParser（分段+风险标注）、useTextDiff（LCS 行级 diff）
├── pages/                # 文档导入 / 送审会签 / 历史快照 / 版本对比 / 风险标注 / 审阅清单
├── router/               # 路由表（轻量导航由 stores/NavStore 承载）
├── utils/                # 正文指纹、签名规则、本机仓储、审计留痕、异常、格式化
└── mocks/                # 旧实体种子 + approvalSeed（新版草稿/历史快照种子）
```

## 数据模型

| 模型 | 说明 |
|---|---|
| PolicyDocument / PolicySection | 导入的政策文档与自动分段，供对比复用 |
| **ApprovalVersion** | 审批工作版本（DRAFT 草稿 / SUBMITTED 已送审待签 / COMPLETED 会签完成） |
| **ApprovalClause** | 工作版本条款，含风险等级、是否需会签、最近正文变化时间 |
| **ClauseSignature** | 条款签名（clause_id + role 唯一，记录签名人与签名时的正文指纹） |
| **ApprovalSnapshot** | 送审冻结的只读快照，条款与签名内联封存，不可改、不可补签 |
| ApprovalAuditLog | 全部写操作的本机审计留痕 |
| DiffResult / ReviewNote | 原有差异结果与审阅备注模型 |

## 环境变量说明

- `COMPOSE_PROJECT_NAME`: Compose 项目名，默认 `policy-diff`
- `FRONTEND_PORT`: 前端端口，默认 `20112`

## Docker 部署说明

- 根 Compose 文件不写 `version`，顶层 `name: policy-diff`。
- 容器名均使用 `${COMPOSE_PROJECT_NAME:-policy-diff}` 前缀。
- 纯前端服务无数据库卷；数据存在浏览器 localStorage，重置浏览器站点数据即回到初始种子。
- 常见问题：端口占用时修改 `.env` 中端口后重启；`docker compose up -d --build` 可强制重建前端镜像。

## 枚举/常量出现位置清单

- DiffType: constants/DiffType、types/DiffType、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- PrivacyRiskLevel: constants/PrivacyRiskLevel、types/PrivacyRiskLevel、constructors（ApprovalClauseConstructor 的高风险判定）、usePolicyParser 风险标注、logTemplates、formatters、RiskTag、SectionCard、SignaturePanel、SnapshotViewer。
- ReviewStatus: constants/ReviewStatus、types/ReviewStatus、constructors、logTemplates、errorMessages、筛选器、展示组件/控制器均有引用。
- **VersionPhase（DRAFT/SUBMITTED/COMPLETED）**: constants/VersionPhase、types/VersionPhase、types/ApprovalVersion、types/ApprovalSnapshot、statusText、ApprovalStore、approvalWorkflow、PhaseBadge、DocumentsPage、ApprovalPage、SectionCard、SignaturePanel。
- **SignatureRole（LEGAL/BUSINESS）**: constants/SignatureRole、types/SignatureRole、types/ClauseSignature、types/ApprovalSnapshot、statusText、signatureRules、ApprovalSnapshotConstructor、approvalWorkflow、CurrentUserStore、RoleTag、SignaturePanel、ApprovalPage、SnapshotViewer。
- **SignatureStatus（UNSIGNED/SIGNED）**: constants/SignatureStatus、types/SignatureStatus、statusText、SignaturePanel 缺签展示。

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件被刻意拆散到多个目录。本次"送审会签"需求的每条规则都跨层落地：

- 新增一个阶段/角色枚举，需要同步 constants 与 types 双份定义、statusText、formatters、Badge/Tag 组件、页面文案。
- 修改"非排版变化"判定只需改 `utils/fingerprint.ts`，但它同时被 service（清签）、SectionCard（diff 预览）和测试脚本引用。
- 送审/签署的写操作要同步 ApprovalVersion、ApprovalClause、ClauseSignature、ApprovalSnapshot 四张表与 ApprovalAuditLog 留痕，任何一处不一致都会在审核页缺签统计或快照回看时暴露。

## License

MIT
