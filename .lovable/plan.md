## 问题
缘分配对结果保存在 `compatibility_reports.result_data` 时是完整的（包含 destiny card、tags、稀有度 rarity、trafficLight 红黄绿、雷达图 + radarOneLiner、dramaScene 名场面、strengths/conflicts、loveLanguage 全字段 actionForThem/phraseTheyWant、keywords、prophecy、cpName 等），但 `CompatibilityDetail.tsx`（即从"我的测评报告"进入回访时使用的页面）只渲染了其中一小部分：
- ✅ 当前已展示：分数卡、五维度（条形）、strengths、conflicts、loveLanguage 的 mine/partner/tip
- ❌ 缺失：rarity 徽章 + 渐变命运卡风格、cpName、tags、radarOneLiner、雷达图（现在退化成条形）、trafficLight 红黄绿、dramaScene 名场面、loveLanguage.actionForThem、loveLanguage.phraseTheyWant、keywords、prophecy

因此用户看到的"回访版"明显比首次结果页内容少，造成"不一致 / 不全面"的感受。

## 方案
将 `CompatibilityDetail.tsx` 的结果展示对齐到 `CompatibilityFlow.tsx` 中 `step === "result"` 的完整版式，使用同一份 `result_data` 重渲染所有卡片。不改动数据库、edge function、保存逻辑。

### 改动文件
**`src/pages/CompatibilityDetail.tsx`**
1. 引入 recharts 的 `Radar/RadarChart/PolarGrid/PolarAngleAxis/PolarRadiusAxis/ResponsiveContainer`，以及 `RARITY_THEME` / `deriveRarity` 逻辑（可在该文件内复制，避免对 `CompatibilityFlow` 做导出重构）。
2. 按以下顺序渲染（与首次结果页一致）：
   - **命运卡 Destiny Card**：渐变背景 + rarity 徽章 + emoji + cpName + title + overallScore + tags + summary
   - **红黄绿 Traffic Light**：`d.trafficLight.green/yellow/red`
   - **五维雷达图**：`d.dimensions` → RadarChart；下方显示 `d.radarOneLiner`
   - **名场面 Drama Scene**：`d.dramaScene`
   - **Strengths + Conflicts**（保留现有卡片，但合并为一张，与首页一致）
   - **Love Language**：增加 `actionForThem`（绿色块）、`phraseTheyWant`（琥珀色块）
   - **Keywords + Prophecy**：紫色渐变卡
3. 保留头部返回按钮、分享海报按钮、`DeepReportUnlock` 入口、`formatDate` 与 `withPartner` 元信息（可放在命运卡下方一行）。
4. i18n key 直接复用 `assessmentFlow.compatibility.*`（已存在）；`compatibilityDetail.*` 中现有 key 也继续用。无需新增翻译。

### 不动的部分
- `CompatibilityFlow.tsx` 保存逻辑、`result_data` 结构、edge function、RLS、路由。
- `AssessmentReports.tsx` 和 `CompatibilityReports.tsx` 列表页。

### 验证
- 进入 `/compatibility-reports/:id` 查看历史报告：应看到与首次完成时完全相同的 7 张卡内容。
- 旧报告若某些字段缺失（如早期没有 `trafficLight` / `dramaScene` / `keywords` / `prophecy`），对应卡片做空值判断不渲染（与 Flow 页相同逻辑）。
