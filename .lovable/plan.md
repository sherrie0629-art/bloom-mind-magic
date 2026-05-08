## 目标

让"缘分配对（Compatibility）"和其他四种测评一样，拥有统一的"深度报告"入口与权益逻辑：

- 已 Plus 且当日额度未用完 → 直接金色按钮生成；
- 未开通 / 额度用完 → 显示模糊预览 + 升级提示，按钮跳 `/pricing`；
- 已生成则直接渲染。

## 当前状况

- 合盘已有的 `deepAnalysis`（500-800 字，流式生成、内联展示）是结果页内置的"快速深度解读"，写入 `compatibility_reports.result_data.deepAnalysis`。**这部分保留不动**，作为免费即时内容。
- 其他测评的"深度报告"（3000-4500 字、七大章节）由 `generate-deep-report` edge function 产出，存在 `assessment_results.result_data.deepReport`，受 Plus + 每日 1 次配额限制。
- 合盘没有这一层"长篇深度报告"和入口。

## 改动清单

### 1. `supabase/functions/generate-deep-report/index.ts`

- 接受新参数：`source: "assessment" | "compatibility"`（默认 `"assessment"`，兼容现状）+ 当 source 为 compatibility 时使用 `reportId`（沿用 `assessmentId` 字段也可，但语义化加 `reportId`）。
- 当 `source === "compatibility"`：
  - 从 `compatibility_reports` 按 `id + user_id` 拉取；
  - `typeLabel`：zh "缘分合盘"、en "Relationship Compatibility"；
  - `resultData` 取 `result_data`（包含 partner_info、quickResult 各字段、`deepAnalysis`），喂给同一个 system prompt；
  - 已存在 `result_data.deepReport` → 直接返回；
  - 写回时 `update compatibility_reports.result_data` 合并 `deepReport` 字段。
- Plus 校验、每日 1 次配额、AI 调用、prompt 模板全部复用，不另写一份。

### 2. 抽出共享组件 `src/components/DeepReportUnlock.tsx`（新建）

> 因为现在 5 处页面（4 测评结果页 + 我的报告详情 + 合盘详情/合盘结果页）都要这块 UI 与逻辑，先抽组件再接合盘最自然。如果你只想"先把合盘加上、其他不动"，见**最小改动方案**。

封装"未生成 / 已生成"两态：

- props：`{ source: "assessment" | "compatibility"; reportId: string; typeLabel: string; initialDeepReport?: string | null; createdAt?: string }`
- 内部 `useSubscription` 拿 `plan / canDeepReport / deepReportCount`
- `canDeepReport`：按钮金色 CTA → 调 edge function；隐藏模糊预览覆盖与 `plusPerk` 文案
- 否则：模糊预览 + 升级文案，按钮跳 `useNavigate("/pricing")`，不调接口
- 已生成或本次返回成功 → 渲染 `<DeepReportRenderer />`
- 调用 `supabase.functions.invoke("generate-deep-report", { body: { source, reportId, locale } })`

### 3. `src/pages/CompatibilityFlow.tsx`（结果步骤）

- `handleSubmit` 中 insert `compatibility_reports` 改为 `.insert(...).select("id").single()`，存到 `savedReportId` state。
- 在结果区现有底部按钮组下方插入：
  ```tsx
  {savedReportId && (
    <DeepReportUnlock source="compatibility" reportId={savedReportId} typeLabel={t("assessmentFlow.compatibility.deepReportLabel")} />
  )}
  ```
- 注意排序：现有内联 `deepAnalysis`（500-800 字）保留显示在前；下方再展示长篇深度报告入口。

### 4. `src/pages/CompatibilityDetail.tsx`

- 在底部 `Deep Analysis` 区块下方（即文件 244 行 `</div>` 之前）插入：
  ```tsx
  <DeepReportUnlock
    source="compatibility"
    reportId={report.id}
    typeLabel={t("assessmentFlow.compatibility.deepReportLabel")}
    initialDeepReport={report?.result_data?.deepReport}
    createdAt={report.created_at}
  />
  ```

### 5. `src/pages/AssessmentDetail.tsx`

- 把现有内联"未生成"分支替换为 `<DeepReportUnlock source="assessment" reportId={id!} typeLabel={getTitle()} initialDeepReport={(report.result_data as any).deepReport} createdAt={report.created_at} />`，确保所有入口表现一致（顺带修复你上一条提到的"已开通仍显示解锁提示"）。

> 4 个测评结果 Flow 页（MBTI/Enneagram/Emotion/Zodiac）这次**不在本次范围**，留给"统一入口"那条任务的实现阶段。

### 6. i18n（zh/en）

新增：

- `assessmentFlow.compatibility.deepReportLabel`：「缘分合盘」/ "Relationship Compatibility"
其余 key 复用 `assessmentDetail.*`。

## 最小改动方案（如果你想先只动合盘，不抽组件）

- 仅做改动 1（edge function 兼容 `source: "compatibility"`）+ 改动 3、4（在合盘两处直接复制 AssessmentDetail 当前的"未生成"分支 UI，调用同一接口加 `source: "compatibility"`）+ 改动 6。
- 缺点：UI 实现重复，后续维护需要同步。
- 不解决"已 Plus 仍显示模糊覆盖"和"4 个 Flow 页缺入口"的统一问题。

## 不改动

- 合盘内置 `deepAnalysis` 500-800 字流式逻辑、AI 模型、`assessment-compatibility` edge function。
- `useSubscription`、`limits.ts`、Pricing 页。
- `generate-deep-report` 的提示词与配额规则（默认 source=assessment 路径完全不变）。

## 关键约束

- 同一份 prompt + Plus + 每日 1 次配额，对合盘也成立（与其它测评一致）。
- 合盘的"短深度解读（deepAnalysis）"和"长深度报告（deepReport）"并存，互不替代。
- 已 Plus 且未达上限时，UI 必须干净：无模糊覆盖、无 plusPerk 文案、按钮直接生成。

采用**完整方案**（推荐，顺便统一现有 5 处入口）