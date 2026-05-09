## 目标

让缘分配对（CompatibilityFlow）的结果页与其他测评保持一致：去掉当前自动流式生成的"深度解析"卡片，仅保留底部 `DeepReportUnlock` 作为深度报告入口（Plus 解锁、按需生成）。CompatibilityDetail 详情页同步去掉 `deepAnalysis` 卡片，避免重复。

## 改动点

### 1. `src/pages/CompatibilityFlow.tsx`
- 删除状态：`deepAnalysis`、`deepAnalysisDone`。
- 删除函数：`streamDeepAnalysis`，以及 `handleSubmit` 中对它的调用与 reset。
- 删除结果区中"深度解析"流式卡片（约 491–502 行）。
- "和闺蜜聊聊" 按钮 state 中移除 `deepAnalysis` 字段（chat 端只需快速结果即可）。
- "再测一次" 按钮中移除 `setDeepAnalysis("")`。
- 保留底部已有的 `DeepReportUnlock`，行为与 MBTI/九型等测评一致。

### 2. `src/pages/CompatibilityDetail.tsx`
- 删除"📖 Deep Analysis"卡片（读取 `d.deepAnalysis` 的部分）。
- 保留下方已有的 `DeepReportUnlock`，统一入口。

### 3. Edge Function / 数据库
- 不改动 `assessment-compatibility`（仍生成快速结果）。
- 不改动 `generate-deep-report`（已支持 `source: "compatibility"`，由 DeepReportUnlock 调用）。
- 历史 `result_data.deepAnalysis` 数据不动，新报告不再写入该字段。

### 4. i18n
- 不再使用的 key 可留可删；本次保守起见保留 `assessmentFlow.compatibility.deepAnalysis`、`deepAnalysisLoading`，避免影响其他引用。

## 不在范围内
- 不改其他测评、不改深度报告 prompt、不改 UI 视觉风格。
