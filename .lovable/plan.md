## 问题
`心灵状态（Emotion）`测评结果页和 `MBTI / 九型人格 / 星座运势` 测评结果页里都缺少"生成深度报告"入口；用户只能进入"我的报告→详情"才能看到。`缘分配对` 已经有了，作为参考样式。要求在测评完成后的结果页直接展示，与详情页一致。

## 方案

复用 `src/components/DeepReportUnlock.tsx`（已存在并已被 `CompatibilityFlow` / `CompatibilityDetail` / `AssessmentDetail` 使用）。

四个 flow 页面均已经把结果保存到 `assessment_results` 并把 id 存入 `resultIdRef.current`，可直接作为 `reportId` 传入。

### 改动点

1. **`src/pages/EmotionFlow.tsx`**
   - import `DeepReportUnlock`
   - 在结果分支（约 214 行，`actionPlan` 卡片之后、按钮组之前）插入：
     ```tsx
     {resultIdRef.current && (
       <DeepReportUnlock
         source="assessment"
         reportId={resultIdRef.current}
         typeLabel={`${result.emoji || "🎭"} ${result.title}`}
       />
     )}
     ```

2. **`src/pages/AssessmentFlow.tsx`**（MBTI）
   - import `DeepReportUnlock`
   - 在 MBTI 结果展示卡片底部、底部按钮组之前插入同样组件，`typeLabel` 用 `${data.mbtiType} — ${data.title}`。

3. **`src/pages/EnneagramFlow.tsx`**
   - 同上，`typeLabel` 用 `Type ${result.enneagramType} · ${result.title}`。

4. **`src/pages/ZodiacFlow.tsx`**
   - 同上，`typeLabel` 用 `${result.zodiacSign} · ${result.title}`。

### 行为说明
`DeepReportUnlock` 自身已处理：
- Plus 用户：直接显示"生成深度报告"按钮（无锁定提示）
- 免费用户：显示模糊预览 + "升级解锁"按钮跳转 `/pricing`
- 已生成过的报告：直接渲染 `DeepReportRenderer`

与 `AssessmentDetail`（我的报告详情页）行为完全一致。

### 不在范围
- 不动每日塔罗（`DailyTarot`）
- 不动 edge function、不动数据库
- 不重复改 `CompatibilityFlow`（已有）

## 文件
- `src/pages/EmotionFlow.tsx`
- `src/pages/AssessmentFlow.tsx`
- `src/pages/EnneagramFlow.tsx`
- `src/pages/ZodiacFlow.tsx`
