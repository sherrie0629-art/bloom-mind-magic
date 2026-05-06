## 性能瓶颈分析

每日塔罗抽牌的总耗时主要分两段：

1. **即时返回的解读**（用户能立刻看到文字）
   - 串行调用了 2 次 AI：解读（gemini-3-flash-preview）→ 能量打分（gemini-2.5-flash-lite）。
   - 打分这步其实纯属浪费——keywords 列表是静态的，完全可以离线映射，不需要再走一次 AI 往返。

2. **卡牌插画**（用户在「Generating card art...」转圈等待）
   - 走 `gemini-3.1-flash-image-preview`，单次 8–25 秒，已经是最快的图像模型，不可能再砍。
   - 已经用 `EdgeRuntime.waitUntil` 后台异步，但前端轮询间隔 3 秒，最坏情况要多等 3 秒才更新。
   - **关键浪费**：78 张牌 × 正/逆位 = 156 个组合，prompt 完全确定（只跟 `cardName + position + keywords` 有关）。当前每个用户每次都重新生成，互相不复用。第二个抽到「The Fool 正位」的用户应该秒出图。

## 优化方案

### A. 共享卡面图缓存（最大收益）

新增表 `tarot_card_art (card_id int, is_reversed bool, image_path text, primary key)`，加 RLS 允许 authenticated 读。

`tarot-draw` edge function 在生成图前：
1. 先 `select image_path from tarot_card_art where card_id=? and is_reversed=?`。
2. **命中** → 直接把 `image_path` 写入 `tarot_draws`，`image_status='ready'`，**同步返回 imageUrl**，前端零等待、零轮询。
3. **未命中** → 走原有异步生成流程；成功后同时写 `tarot_draws` 与 `tarot_card_art`（用 `upsert ignore-conflict`，并发安全）。

效果：上线后随用户量增长，缓存命中率快速逼近 100%；同一张牌全网只生成一次。

### B. 取消评分 AI 调用

`energy_score` 改为基于 keywords 的本地映射（在 edge function 中维护一个简单的关键词→分数表，或直接用 `is_reversed` + 关键词情感词典快速估算），节省 1 次 LLM round-trip（约 1–2 秒），让解读返回更快。

### C. 缩短前端轮询间隔

`DailyTarot.tsx` 中 `setInterval` 由 3000ms → 1500ms，最多保留 60 次（90 秒上限）。在缓存未命中场景下平均节省 1.5 秒等待。

### D. 解读文案保持不变

解读本身依赖用户当下的随机抽牌结果，且字数不长，已经是最快档模型，不再优化。

## 范围

- 新增 migration：建 `public.tarot_card_art` 表 + RLS。
- 修改：`supabase/functions/tarot-draw/index.ts`（缓存查找/写入；移除评分 AI；命中时同步返回 image_path 的 signed URL）。
- 修改：`src/pages/DailyTarot.tsx`（轮询间隔 1.5 秒）。

## 验证

- 第一次抽到某张新牌：行为同今天（异步生图 + 转圈），但少一次 AI round-trip。
- 第二次任意用户抽到同一张牌：解读和图片**同时**返回，前端不再显示「Generating card art...」。
- 数据库：`tarot_card_art` 表行数随时间增长，最多 156 行后保持稳定。
