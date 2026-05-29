# 塔罗牌面预填充缓存方案

参照已有的 `prefill-mbti-posters` 模式，把 22 张大阿尔卡那 × 2 个方向（正位/逆位）= **44 张**塔罗牌图全部预生成并写入共享缓存。之后用户在每日塔罗或聊天抽牌时，都会直接命中缓存，秒出图。

## 现状

- 抽牌函数 `tarot-draw` 与 `chat-tarot-draw` 都已经在用 `tarot_card_art` 表 + `tarot-card-art` 存储桶做共享缓存，逻辑是「命中缓存 → 返回签名 URL；未命中 → 现场调用 Gemini 生成 → 上传 → 写表」。
- 卡池（22 张 × 正/逆位关键词）已经在 `chat-tarot-draw/index.ts` 内置；可以直接复用同一份数据。
- 桶 `tarot-card-art` 当前是私有桶，访问通过 `createSignedUrl`，无需改动权限。

## 新增内容

### 1. 边缘函数 `supabase/functions/prefill-tarot-cards/index.ts`

完全对齐 `prefill-mbti-posters` 的鉴权与执行风格：

- 鉴权：接受 service role key **或** 已登录管理员 JWT（`has_role(user_id, 'admin')`）。
- 入参（POST body，可选）：
  - `cardIds?: number[]` — 只生成指定卡牌（默认全部 22 张）
  - `orientations?: ("up"|"rev")[]` — 默认 `["up","rev"]`
  - `force?: boolean` — 为 true 时即使缓存已存在也重新生成并覆盖
- 流程，每张卡（共最多 44 个组合）顺序执行：
  1. 查 `tarot_card_art` 是否已有 `card_id + is_reversed` 记录；非 force 模式下命中即跳过。
  2. 调用 Lovable AI Gateway（`google/gemini-3.1-flash-image-preview`），prompt 与 `chat-tarot-draw` 现有 `generateCardImage` 保持一致，确保风格统一。
  3. 上传到 `tarot-card-art` 桶，路径 `shared/<id>_<up|rev>.png`（固定路径，便于 force 覆盖）。
  4. `upsert` 写入 `tarot_card_art`。
  5. 每张之间 `sleep(1500ms)` 限流，避免触发 429。
- 返回 `{ summary: { generated, skipped, errors }, results: [...] }`。

### 2. 触发方式

不加 UI 按钮，沿用 MBTI 预填的做法 —— 管理员在浏览器控制台执行：

```js
window.supabase.functions.invoke('prefill-tarot-cards', { body: { force: false } })
```

满载一次约 44 × ~3s + 限流 ≈ 3 分钟，单次 invoke 在边缘函数 CPU 限额内可完成。若担心超时，可分批：`{ cardIds: [0,1,2,...,10] }`。

### 3. 配套小改

- `supabase/config.toml` 无需改动（默认 `verify_jwt = false`，我们在代码里自己校验）。
- 已有抽牌函数完全不用改 —— 缓存填好后它们自然命中。

## 技术细节

```text
prefill-tarot-cards
 ├─ auth check (service role | admin JWT)
 ├─ build target list (cardIds × orientations)
 ├─ for each (cardId, isReversed):
 │    skip if exists && !force
 │    fetch Gemini image (same prompt as chat-tarot-draw)
 │    upload to tarot-card-art/shared/<id>_<up|rev>.png (upsert)
 │    upsert tarot_card_art row
 │    sleep 1500ms
 └─ return summary
```

确认后我会直接创建该函数并部署，再告知你在控制台运行的具体命令。
