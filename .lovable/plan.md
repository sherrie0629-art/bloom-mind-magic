## 问题诊断

**问题 1：维度名中英混杂**
`AssessmentDetail.tsx` 用 `t("assessmentDetail.dim.${k}", { defaultValue: k })` 渲染维度名。当中文字典缺失对应 key 时，回退到原始英文字段名。盘点缺失：
- 九型（zh & en）：`selfAwareness`、`empathy`、`resilience`（仅 `growth` 已译为"成长性"，所以你看到一半中文一半英文）
- 心灵体检（zh & en）：`burnout`、`boundaries`、`regulation`
- 缘分配对 `CompatibilityDetail.tsx`：维度名直接用硬编码英文 `DIM_LABELS`，"Five Dimensions" / "Strengths" / "with {name}" 等也是硬编码英文，完全没走 i18n

**问题 2：百分比都是个位数（7%、6%）**
所有 edge function 的 `traits/dimensions` schema 只声明 `type: number`，没有取值范围或语义说明，AI 经常返回 0–10 的小数值。

## 修复方案

### A. 补齐 i18n 维度词条（`src/i18n/locales/zh.json` 与 `en.json`）
在 `assessmentDetail.dim` 下补齐：
- 九型：`selfAwareness`（自我觉察 / Self-Awareness）、`empathy`（共情力 / Empathy）、`resilience`（心理韧性 / Resilience）
- 心灵体检：`burnout`（倦怠值 / Burnout）、`boundaries`（边界感 / Boundaries）、`regulation`（情绪调节 / Regulation）
- 缘分配对五维（新增子组）：`emotional`、`communication`、`values`、`growth`、`chemistry` 中英版

### B. CompatibilityDetail.tsx 接入 i18n
- "Five Dimensions"、"Strengths"、"with Partner" 等硬编码字符串改用 `t()`
- 删除组件内的 `DIM_LABELS` 常量，统一用 `t("assessmentDetail.dim.${key}")`，与其他报告保持一致

### C. 让 AI 输出有说服力的百分比
在四个测评 edge function（`assessment-enneagram`、`assessment-emotion`、`assessment-zodiac`、`assessment`）的 traits/dimensions schema 中，把每个数值字段的 `description` 强化为："Integer 0-100. 用户作答得分典型分布在 45-92，最高维通常 75-92，最低维通常 30-55；禁止集中在 0-15 区间"。同时在 system prompt 末尾追加一行约束。

### D. 兜底归一化（前端容错，覆盖历史报告）
新增小工具函数 `normalizeTraitScores(traits)`（放在 `src/lib/utils.ts` 或新建 `src/lib/scoreNormalize.ts`）：
- 若所有值的最大值 < 35，按 `value * (85 / max)` 线性放大并取整，保持相对比例
- 否则原值返回

在 `AssessmentDetail.tsx` 和 `CompatibilityDetail.tsx` 渲染维度前调用，确保旧数据也不再出现 7%、6% 这种弱说服力数字。

## 影响范围
- 4 个文件改动：`src/i18n/locales/zh.json`、`src/i18n/locales/en.json`、`src/pages/AssessmentDetail.tsx`、`src/pages/CompatibilityDetail.tsx`
- 4 个 edge function 描述文案微调
- 1 个新建工具函数

不涉及数据库结构、不动现有 result_data。
