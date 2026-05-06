## 现状

`/assessment/mbti` 点击"开始"后，要等 `assessment` 边缘函数调用 `gemini-2.5-flash-lite` 生成 10 道剧情题，单次返回 ~2600 tokens、典型耗时 6–12 秒。这段时间用户只能看 loading，体感很糟。

## 优化思路（按收益从大到小）

### 方案 A · 预置题库 + 后台刷新（推荐，几乎 0 等待）

**核心：客户端内置 5 套精心打磨过的剧情题（每套 10 道，中英各 5 套），开始测评时随机抽一套立即开题；同时后台异步去 AI 生成新题塞进缓存，下一次优先用。**

- 新增 `src/data/mbtiQuestionPool.ts`：导出 `zh: QSet[]` 与 `en: QSet[]`，每套结构与现有 `batch-questions` 返回值一致（`question / options / dimension`）。  
  题目用一次脚本（`/tmp` 跑 `lovable_ai.py` 调 AI）批量生成 + 人工微调后落到该文件，不走运行时 AI。
- `src/pages/AssessmentFlow.tsx` 的 `handleStart`：
  1. **同步**：从 pool 随机抽一套 → 立刻 `setCurrentQuestion(set[0])`、`batchQuestionsRef.current = set.slice(1)`、`setLoading(false)`。用户**立刻**看到第 1 题。
  2. **后台**：`supabase.functions.invoke("assessment", { body: { action: "batch-questions", locale } })` 不 await，返回后写入 `sessionStorage("mbti-fresh-pool")`，下次开测时优先用并补一套新题。
- 这样：首次 0 秒等待；后续仍有 AI 生成的新鲜感。

### 方案 B · 加速服务端（不改架构，作为补充）

即便走 AI 路径，也能砍掉一半时间：

1. **流式返回 + 边到边显示**：把 `batch-questions` 改为 SSE 流，客户端解析到第 1 道完整 JSON 就立即展示，剩下 9 道边下边塞进 ref。Gemini tool-calling 流式确实可行（按 chunk 拼 arguments，监测 `questions[0]` 闭合括号）。  
   工作量较大、解析脆弱，建议只在方案 A 之外作为锦上添花。
2. **降负载**：`max_tokens` 2600 → 1800（每题字数已限定）、`temperature` 1.0 → 0.85；首屏只生成 5 题，用户答到第 4 题时再悄悄请求后 5 题。
3. **更快的模型**：把 `google/gemini-2.5-flash-lite` 换成 `google/gemini-3.1-flash-lite-preview`（同类更新版，吞吐更高）。
4. **服务端按 locale 预热缓存**：在 `assessment` 函数里加一个 KV/Storage 缓存（`mbti-questions-zh-${date}.json`），1 小时内的请求直接返回。所有用户共享同一套题，AI 只为第一位用户跑。

### 方案 C · UX 减痛（即便不优化也要做）

- Loading 阶段把现有 `loadingMessages` 改成**进度条 + 渐进文案**（"正在偷看你的潜意识 35%"），并放一段 ~3s 的破冰小问题（如"先选个今天的心情"），把等待变成内容。
- 在 intro 页 mount 时就预热一次 `batch-questions`（用户读介绍的 5–8 秒可以拿来跑 AI），点击"开始"时直接读 ref。**这一招几乎免费，强烈建议无论选哪个方案都先做。**

## 推荐组合

**先做方案 C 的预热（10 行代码）+ 方案 A 的本地题库**：上线后 99% 的用户开测瞬间就能看到第 1 题。  
方案 B 的服务端缓存可作为兜底，让 AI 调用降到每天个位数次。

## 涉及文件

- `src/pages/AssessmentFlow.tsx`：intro 页预热 + 本地 pool 抽题 + 后台刷新
- `src/data/mbtiQuestionPool.ts`（新增）：中英各 5 套精修题
- `supabase/functions/assessment/index.ts`：可选加 Storage 缓存 + 切模型
- `src/i18n/locales/{zh,en}.json`：可选优化 loading 文案

## 风险与取舍

- 本地题库会让代码包多几十 KB（10 套 × 10 题，纯文本），完全可接受。
- 同一套题可能被同一个用户重复抽到。可以记一下 `localStorage("mbti-last-set-id")` 避免连抽同一套。
- 方案 A 牺牲一点"每次都是 AI 现编"的故事性，但题目质量反而更稳（可控、可审）。
