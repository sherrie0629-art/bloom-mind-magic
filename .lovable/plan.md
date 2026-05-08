## 八字模块清理 + 顺手修复函数错位

入口已下线，本次把所有八字残留代码删除；同时顺手解决之前发现的"`assessment-bazi` 函数实际跑的是九型逻辑"这个错位 bug。

## 改动清单

### 删除
- `src/pages/BaziFlow.tsx`
- `supabase/functions/assessment-bazi/`（同时调用 `delete_edge_functions` 卸掉线上部署）

### 重命名（防止未来再串台）
- 把原 `assessment-bazi/index.ts` 内容（其实是九型逻辑）整体迁到新建的 `supabase/functions/assessment-enneagram/index.ts`

### 修改

**`src/App.tsx`**
- 删除 `Route path="/assessment/bazi"` 这一行（旧入口已下线）

**`src/pages/EnneagramFlow.tsx`**
- 两处 `invoke("assessment-bazi", …)` 改为 `invoke("assessment-enneagram", …)`

**`src/pages/AssessmentReports.tsx`**
- 删除 meta 表里的 `bazi: { icon: Flame, … }` 一项；如 `Flame` 图标无其他引用则同时删除该 import

**`src/i18n/locales/zh.json` / `en.json`**
- 删除 `assessmentFlow.bazi` 整段（zh/en 各 ~22 行）
- 删除 `assessmentReports.labels.bazi`

**`supabase/functions/generate-deep-report/index.ts`**
- 从 `kindLabels` 的 `en` 与 `zh` 中移除 `bazi` 键

### 数据保留策略
数据库 `assessment_results.assessment_type = 'bazi'` 的历史记录**保留**（不删迁移），仅在 `AssessmentReports` 列表里因为 meta 表无对应项而隐藏；这样老用户数据不丢，未来想恢复入口也容易。如希望硬清理也可以一句 SQL 迁移，本次默认不动。

## 不动
- 八字相关的 storage bucket / 历史结果数据
- 其他 4 个测评的逻辑

## 验收
- `rg -i "bazi|八字"` 在 `src/` 与 `supabase/functions/` 内只剩 `generate-deep-report` 之外 0 命中（或全部清理后 0 命中）
- 路由 `/assessment/bazi` 进入 NotFound
- 九型测评仍能正常出题、出结果（函数名变更但逻辑不变）
- 测评报告列表不再出现八字条目，老九型/MBTI/星座/心灵体验报告正常显示
