## 目标

把"缘分配对"的报告也并入"我的报告"列表（`/assessment-reports`），和 MBTI/九型/星座/情绪测评一起按时间排序展示，点击跳转到现有的 `/compatibility-reports/:id` 详情页。

## 改动点

### `src/pages/AssessmentReports.tsx`
1. 数据源：在原 `assessment_results` 查询的基础上，并行查询 `compatibility_reports`，合并为统一列表。
   - 统一结构示例：`{ id, kind: "assessment" | "compatibility", type, result_data, partner_info?, created_at }`
   - 按 `created_at` 倒序合并。
2. 列表项渲染：
   - 新增 `compatibility` 类型图标（`Heart`，`bg-gradient-to-br from-rose-warm to-secondary`）。
   - `getTitle`：缘分配对显示 `💕 {cpName 或 我 & 对方姓名} · {overallScore}%`。
   - `getDesc`：取 `result_data.summary` 截断。
3. 点击跳转：
   - `kind === "compatibility"` → `navigate('/compatibility-reports/{id}')`
   - 其他保持 `/assessment-reports/{id}`
4. 空态文案不变。

### i18n
- 复用现有 `assessmentReports.*` key，无需新增（标题中所需文案已在 compatibility 命名空间里）。

## 不在范围
- 不改 `/compatibility-reports` 列表页（保留作为独立入口，Profile 菜单不变）。
- 不改任何后端、表结构或详情页。
