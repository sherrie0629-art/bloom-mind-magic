## 在管理员后台增加订阅管理与额度展示

### 背景
当前 `/admin` 的"用户"标签只支持把用户设为 Plus 1 个月 / 1 年，或移除 Plus；今日用量虽然已经从 `usage_tracking` 读了一行，但只展示一行很小的文字。需要：
1. 管理员可手工把用户切换到 **任意订阅版本**（Free / Plus 月付 / Plus 年付），并自定义到期时间。
2. 用户卡片清晰显示该用户的 **使用额度**（今日 chat、assessment、deep_report 计数 + 对应套餐的上限）。

### 改动内容

**1. `src/pages/Admin.tsx` — 用户标签升级**

- 扩展 `UserRow.usage` 字段，加入 `deep_report_count`，并在 `loadUsers` 的 `usage_tracking` 查询里 select 这一列。
- 在每张用户卡片下新增"使用额度"区块，按照 `useSubscription` 里的 `LIMITS` 常量显示三行：
  - 对话：`chat_count / 20`（free）或 `/ 9999`（plus）
  - 测评：`assessment_count / 5` 或 `/ 9999`
  - 深度报告：`deep_report_count / 0` 或 `/ 1`
  - 每行配一个进度条（复用现有 `bg-muted` + 渐变填充样式），plus 显示为"无限"。
- 把现有"1 Month / 1 Year / Remove Plus"按钮改成一个"管理订阅"按钮，点击后展开一个内嵌面板（同卡片内 `useState` 控制），包含：
  - 套餐 select：Free / Plus
  - 计费周期 select：Monthly / Yearly（仅 Plus 时启用）
  - 到期时间 `<input type="date">`，默认 = 今天 + 30/365 天，可手工修改；Free 时禁用并清空
  - "保存"按钮：调用新的 `applySubscription(userId, { plan, billingPeriod, expiresAt })` 函数
  - "取消"按钮：折叠面板
- `applySubscription` 逻辑：
  - Free：`update user_subscriptions set plan='free', expires_at=null, billing_period='monthly'`（若不存在则 insert）
  - Plus：upsert `plan='plus'`, `expires_at=<选择的日期 ISO>`, `billing_period=<选择>`
  - 完成后 `loadUsers()` 刷新 + toast 提示
- 把 `LIMITS` 常量从 `useSubscription.ts` 里抽出到 `src/lib/limits.ts`（导出 `PLAN_LIMITS`），让 Admin 与 Hook 共用，避免硬编码漂移。

**2. `src/lib/limits.ts`（新建）**
```ts
export const PLAN_LIMITS = {
  free: { chat: 20, assessment: 5, deepReport: 0 },
  plus: { chat: 9999, assessment: 9999, deepReport: 1 },
};
```
然后 `useSubscription.ts` 改成 `import { PLAN_LIMITS as LIMITS } from "@/lib/limits"`，行为不变。

### 不会改动
- 数据库结构、RLS、Edge Functions、Paddle 集成
- 用户端的额度展示与计费流程
- 其他 Admin 标签（Overview / Purchases / Settings）

### 验证
进入 `/admin` → 用户标签 → 任一用户卡片可见三条额度进度 → 点"管理订阅" → 选 Plus + Yearly + 自定义到期日 → 保存 → toast 成功，卡片重新渲染显示新到期时间和 Plus 上限。切回 Free 同样可用。
