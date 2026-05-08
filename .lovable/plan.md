## 问题

当用户已达服务端的"每日测评次数上限"（20/天，Plus 用户）时，前端 `supabase.functions.invoke` 收到 429，错误冒泡到 `catch (e)` 后被 `toast.error(e.message)` 直接展示成英文原始报错（"Edge function returned a non-2xx..."），并触发白屏的 RUNTIME_ERROR。

## 方案

不修改任何配额策略（保留服务端 20/天限制）。仅在前台 5 个测评入口页面的错误处理中识别 429/limit 错误，弹出已有的中英双语友好提示，避免抛出原始英文错误。显示文案：您已经到达当前付费版本的每次生成上限。

## 修改点

仅前端、仅文案展示，不动业务逻辑：

1. `**src/pages/AssessmentFlow.tsx**` — `fetchResult` 的 catch：判断 `error?.context?.status === 429` 或 message 含 `429`/`limit`，显示 `t("assessmentFlow.common.limitReached", { n: 20 })` 后 return；其他错误保留原有提示。
2. `**src/pages/EmotionFlow.tsx**` — 同样模式，作用于 `fetchResult` 与 `handleStart` 的两处 catch。
3. `**src/pages/EnneagramFlow.tsx**` — 同样模式，作用于 `fetchResult` 与 `handleStart` 的两处 catch。
4. `**src/pages/ZodiacFlow.tsx**` — 同样模式，作用于 `fetchResult` 与 `handleStart` 的两处 catch。
5. `**src/pages/CompatibilityFlow.tsx**` — `handleStart` 的 catch 处增加同样判断，使用 `t("assessmentFlow.compatibility.dailyLimitReached", { n: 20 })`。

## 技术细节

- `supabase-js` 在非 2xx 时抛 `FunctionsHttpError`，其 `error.context` 是 `Response` 对象，可读 `status`。为兼容起见，同时检查 `message` 字段中的 `429` 或 `limit` 关键字。
- 上限数字写为常量 `20`（与服务端 `PLUS_DAILY_ASSESS` 对齐）；如未来希望由服务端返回真实数字，可后续从响应 body 解析 `data.dailyLimit` 再展示。本次先用静态值，避免改动后端契约。
- 不修改 `useSubscription` / `limits.ts` / 任何 edge function。