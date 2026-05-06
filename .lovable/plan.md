## 优化目标
星座结果页的 AI 配图生成太慢，原因是图片请求要等问答完成、AI 文本结果返回后才发起，并且每次都重新生成（无缓存命中）。

## 现状
- `ZodiacFlow.tsx` 中 `fetchResultImage` 在 `fetchResult` 拿到文本结果后才调用。
- `getImagePrompt` 依赖 `result.zodiacSign + result.element`，但这两个值在用户点选星座时就已经确定（固定 12 种）。
- 调用 `fetchAIImage(prompt)` 时没有传 `cacheKey`，导致 `generate-poster-image` 边缘函数无法走 storage 缓存命中分支，每个用户每次都重新跑模型。

## 优化方案

### 1. 提前并行触发图片生成
在 `handleSelectSign` 选定星座的瞬间就启动 `fetchAIImage`，与 10 题问答和文本结果生成完全并行。等用户答完题、文本结果返回时，图片大概率已就绪可直接展示。

- 用 `imagePromiseRef = useRef<Promise<...> | null>(null)` 持有进行中的图片请求。
- 进入结果页时 `await` 该 promise 即可（已完成则瞬时拿到）。
- 若用户中途返回选择其他星座，重置该 ref 并重新触发。

### 2. 启用 storage 缓存（关键）
图片只与「星座 + 元素」相关，可用稳定 `cacheKey`，例如 `zodiac_${sign.toLowerCase()}`（如 `zodiac_aries`）。
首次某星座生成后写入 `mbti-poster-art` bucket，之后所有用户的同一星座请求直接返回 CDN URL，<200ms 完成。

调整 `useSharePoster.fetchAIImage` 的调用，第二个参数传 `{ cacheKey }`；客户端内存缓存 (`imageCache`) 也会用 cacheKey 命中。

### 3. 图片 prompt 与文本结果解耦
将 `getImagePrompt` 改为只依赖 `sign.name + sign.element`（来自常量 `ZODIAC_SIGNS`），不再读取 `result.title`。这样才能在选定星座时就提前触发，并且 prompt 稳定 → 缓存键稳定。

### 4. 海报分享复用同一缓存
`handleSharePoster` 已经传 `preloadedImageUrl: resultImageUrl`，无需变动；若图片未就绪 fallback 走 `imagePrompt` 时也加上同样 `cacheKey`（需要在 `useSharePoster` 中支持 imagePrompt 的 cacheKey，或简单地在调用处直接传 preloaded URL）。

## 涉及文件
- `src/pages/ZodiacFlow.tsx`：提前触发图片、用 ref 持有 promise、prompt 改为 sign-only。
- `src/hooks/useSharePoster.ts`：`fetchAIImage` 调用处确保 `cacheKey` 透传（已支持，仅需调用处传入）。
- `supabase/functions/generate-poster-image/index.ts`：无需改动，已支持 cacheKey 缓存路径。

## 预期效果
- 首次某星座：图片生成与 10 题问答并行（节省 5–15 秒等待）。
- 第二次起任何用户同星座：直接命中 storage 缓存，几乎瞬开。
