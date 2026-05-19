## 目标
让抽牌后展示的塔罗卡片消息能持久化保存，刷新页面后仍能在对话历史里看到（包括卡名、正/逆位、关键词与卡面图）。

## 现状
- `Chat.tsx` 抽牌时插入了一条 `kind: "tarot-card"` 的本地消息（含 `tarotCard` 对象），但 `saveMessage()` 只写 `chat_messages.content`，没有保存 `kind` / 卡片数据。
- `chat_messages` 表只有 `id / conversation_id / role / content / created_at`，没有承载结构化数据的字段。
- 加载历史时只按 `role + content` 还原，无法重建塔罗卡片。
- `tarot-card-art` 桶是私有的，签名 URL 只有 1 小时有效期，无法直接写死保存。

## 方案

### 1. 数据库迁移
给 `chat_messages` 增加 `metadata jsonb`（可空，默认 `null`），用来存非文本消息的结构化负载。无需新表，向后兼容。

### 2. 保存塔罗消息
在 `Chat.tsx` 抽牌成功后：
- 在已有 `setMessages` 更新卡片的同时，调用一个新的 `saveTarotMessage(convId, card)` 写一条 `chat_messages`：
  - `role = "assistant"`
  - `content = ""`（占位，便于按时间排序）
  - `metadata = { kind: "tarot-card", cardId, cardName, cardNameCn, emoji, isReversed, keywords, imagePath }`
- 让 `chat-tarot-draw` 边缘函数额外返回 `imagePath`（已有变量，仅需加入响应），前端把 `imagePath` 存进 metadata（签名 URL 不存，每次加载再生成）。
- `saveMessage` 改造为可选传入 `metadata`，统一通过 `.insert` 写入。

### 3. 加载历史时还原卡片
- `select` 增加 `metadata` 字段。
- 映射消息时：若 `metadata?.kind === "tarot-card"`，构造 `Message { kind: "tarot-card", tarotCard: { ...metadata, imageUrl: null, imageStatus: "pending" } }`。
- 加载完毕后，批量对所有需要图片的卡片调用一次新增的 `chat-tarot-image` 边缘函数（或复用现有函数加 `mode: "sign"` 分支），根据 `imagePath` 数组返回新的签名 URL（1 小时），前端写回 `tarotCard.imageUrl` + `imageStatus: "ready"`。失败的回落到 emoji 占位。

### 4. 传给 AI 的上下文
`messages` 给后端时已过滤 `kind === "tarot-card"`，保持不变；只需确保过滤逻辑使用 `metadata.kind` 或本地 `kind` 都成立。

## 文件改动
- `supabase/migrations/<new>.sql`：`alter table public.chat_messages add column metadata jsonb;`
- `supabase/functions/chat-tarot-draw/index.ts`：响应里加 `imagePath`；新增 `mode: "sign"` 分支：传入 `[{cardId, isReversed, imagePath}]` 数组，返回 `{imagePath: signedUrl}` 映射。
- `src/pages/Chat.tsx`：
  - `saveMessage` 支持 metadata。
  - 抽牌路径写库。
  - 历史加载兼容 metadata，并触发批量签名。
- `src/components/TarotCardInline.tsx`：无需改动（已支持 `imageStatus: "pending"` 显示加载态）。

## 验证
1. 抽一张牌 → 刷新 → 卡片消息仍在对话流里，且 1 秒内出现卡面图。
2. 旧 `chat_messages`（metadata 为空）正常展示文本。
3. 再次刷新（>1 小时后）图片仍可正常重新签名加载。
4. 历史回传给 AI 的消息中不含卡片占位条目。