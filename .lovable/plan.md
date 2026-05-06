## 问题诊断

MBTI 结果页的配图慢，根因有三个：

1. **每次都重新调用 AI 生成图片**：`generate-poster-image` 调用 `gemini-3.1-flash-image-preview`，单次耗时 5–15 秒，且**每个用户、每次测评都重跑一次**，即使 MBTI 类型相同（只有 16 种）。
2. **图片以 base64 dataURL 返回**：体积大（几百 KB～几 MB），写入 `assessment_results.result_data` 后续读取也慢。
3. **图片请求等结果出来才开始**：`fetchResultImage` 在 `fetchResult` 完成后才触发，串行等待。

由于 MBTI 只有 16 种类型，**绝大多数请求其实可以直接命中缓存**，这是最大优化空间。

## 优化方案（不改变视觉与交互）

### 1. 服务端按 MBTI 类型全局缓存图片（最关键）

- 新建公开 Storage 桶 `mbti-poster-art`，文件名 `mbti-{TYPE}.png`（如 `mbti-INFP.png`）。
- 改造 `supabase/functions/generate-poster-image/index.ts`：
  - 接收可选参数 `cacheKey`（客户端传 `mbti-INFP` 这种）。
  - **先查桶**：若 `{cacheKey}.png` 已存在 → 直接返回其 `getPublicUrl`，跳过 AI 调用。命中后接口耗时 < 200ms。
  - **未命中**：调用 AI 生成，把返回的 base64 解码成 PNG `Blob` → 上传到桶 → 返回公开 URL。
  - 仍然兼容旧的"无 cacheKey"调用路径（其他海报场景照常走 AI）。

效果：第一个抽到 INFP 的用户付出一次生成成本，之后所有 INFP 用户**几乎立刻**拿到图。

### 2. 客户端改为存储/复用公开 URL

- `src/pages/AssessmentFlow.tsx` 的 `fetchResultImage` 调用 `generate-poster-image` 时传 `cacheKey: \`mbti-${result.mbtiType}\``。
- 拿到的 `imageUrl` 现在是一个公开 CDN URL（不是 base64），写入 `assessment_results.result_data.imageUrl` 体积变小、回看历史结果秒开。
- `src/hooks/useSharePoster.ts` 中 `imageCache` 的 key 改为 cacheKey（命中率更高），并保留按 prompt 兜底。

### 3. 提前并行预取，缩短感知等待

- 在 `fetchResult` 拿到 `mbtiType` 后，**同时**触发 `fetchResultImage` 与 `fetchParallelUniverse`（已经并行，保留）。
- 进一步：在第 10 题被回答后立刻 `prefetch` 一张"通用占位渐变图"（CSS 已有）作为骨架，无需额外网络。
- 在 `ResultAIImage.tsx` 给 `<img>` 加 `decoding="async"` 与 `loading="eager"`，避免主线程阻塞渲染。

### 4. 兜底：AI 失败时不再让用户干等

- `generate-poster-image` 失败或 30 秒未返回时，客户端不再无限 spin。改为 `setImageLoading(false)`、`resultImageUrl=null`，结果页直接渲染（保留 MBTI 文案、维度条、平行宇宙），不影响主流程。
- `useSharePoster` 已对 `preloadedImageUrl` 缺失场景做了兼容（直接跳过插图区），无需改动海报逻辑。

## 涉及文件

- `supabase/functions/generate-poster-image/index.ts`：加 cacheKey 缓存逻辑、上传到新桶。
- `src/pages/AssessmentFlow.tsx`：调用时传 cacheKey；超时兜底。
- `src/hooks/useSharePoster.ts`：`fetchAIImage` 支持 cacheKey、缓存 key 调整。
- `src/components/ResultAIImage.tsx`：`<img>` 加 `decoding="async"`。
- 新增 Storage 桶 `mbti-poster-art`（public）+ 一条让 service role 可写、anon 可读的策略。

## 不会动的部分

- 视觉、布局、文案、海报样式、维度条、平行宇宙模块、分享流程均保持原样。
- 其他测评（八字、九型等）的海报生成逻辑不受影响（不传 cacheKey 时走旧逻辑）。

## 预期效果

- 首位用户（冷启动）：与现在相同（5–15s）。
- 之后 16 种类型都被覆盖一次以后：图片加载从 5–15s → **<500ms**（CDN 直出）。
- `assessment_results` 表存储体积明显下降，历史报告页也会更快。
