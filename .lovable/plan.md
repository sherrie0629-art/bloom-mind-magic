## 目标

让 AI 角色真正"懂你"——把当前只在归档时落库、按 agent 隔离的记忆体系，升级为**实时提取 + 语义召回 + 分层衰减 + 跨角色共享**的四层架构。

## 分步实施方案

### 阶段 1：跨角色用户画像层（最高 ROI，先做）

**目标**：让所有角色共享用户的长期偏好/身份信息（名字、职业、喜好、关系网、价值观），避免每个角色都要"重新认识"用户。

**改动**：

- 新表 `user_profile_facts`：`user_id` / `category`（identity/preference/relationship/value/goal）/ `key`（如 "job", "partner_name"）/ `value` / `confidence`(0-1) / `last_confirmed_at` / `source_agent_id`。`(user_id, category, key)` 唯一约束，便于 upsert。
- RLS：用户仅管理自己。
- `chat` 函数系统提示中追加 `## 关于用户`段落，注入 confidence ≥ 0.6 的 facts。
- 提取逻辑：见阶段 2。

### 阶段 2：实时记忆提取（不再等归档）

**目标**：会话进行中就把新偏好/事件写入记忆，下一轮就能用上。

**改动**：

- 在 `supabase/functions/chat/index.ts` 流式响应**结束后**（不阻塞用户），异步触发新边缘函数 `extract-memory-incremental`。
- 该函数只看**最近 1 轮 user + assistant**，用 Gemini Flash Lite + 工具调用产出：
  - `user_memories` 增量（emotion/event 短期）
  - `user_profile_facts` upsert（preference/identity/relationship 长期）
- 触发节流：每 3 轮 user 消息执行一次，或检测到关键句式（"我喜欢…"、"我老公…"、"我在 X 公司"）立即触发。
- 保留现有 `summarize-conversation` 用于归档时做"整段总结"。

### 阶段 3：语义召回（embedding + pgvector）

**目标**：随记忆量增长仍能精准命中相关历史，而不是全量塞进 prompt。

**改动**：

- `create extension vector;`
- `user_memories` 加 `embedding vector(1536)` + HNSW 索引。
- 新边缘函数 `embed-memory`：在 `summarize-conversation` 和 `extract-memory-incremental` 写入后，用 `openai/text-embedding-3-small`（1536 维，便宜）补 embedding。
- 召回 RPC `match_user_memories(user_id, agent_id, query_embedding, k)`：
  - 当前 agent 的 memory 权重 ×1.3
  - 跨 agent memory 权重 ×1.0（用于"换角色还能想起你"）
  - 按 `importance × similarity × 时间衰减`排序，取 top 8
- `Chat.tsx` 在发送前，用最近一条 user message embedding 一次，把召回结果当 `memoryContext` 传入（替换现有"全拉"逻辑）。

### 阶段 4：分层 TTL 与衰减

**目标**：情绪类记忆不要无限累积污染上下文；偏好类长期保留。

**改动**：

- `user_memories.category` 已有，按类型设 TTL：
  - `emotion` → 30 天后 importance 降到 1，60 天软删
  - `event` → 90 天衰减
  - `preference` / `person` / `insight` → 不衰减，但迁移到 `user_profile_facts` 后从 memories 表清理
- 用 pg_cron 每日跑 `decay_memories()` 函数（或边缘函数 + Supabase Scheduler）。
- 召回时用 `importance * exp(-age_days / half_life)` 加权。

## 验证清单

- 阶段 1 后：在 Luna 说"我老公叫小明" → 切到其他角色 → 对方能自然提到"小明"
- 阶段 2 后：本轮说"我最近在学滑雪" → 下一轮 AI 主动问起，不用等会话结束
- 阶段 3 后：积累 100+ 条记忆后，AI 仍能在被问"上次我们聊到工作焦虑你说什么来着"时精准定位
- 阶段 4 后：3 个月前的临时情绪不再出现在 prompt，但"我是设计师"这种身份信息一直在

## 技术注意点

- Embedding 调用走 Lovable AI Gateway，密钥保留在边缘函数
- 实时提取异步触发，绝不阻塞聊天主流；失败静默，下次归档兜底
- `user_profile_facts` 用 confidence 而不是直接覆盖，避免一次错判永久污染
- 跨角色共享只共享 `user_profile_facts`，`user_memories`（含情绪/八卦/事件）仍按 agent 隔离，保护角色人设独立性

## 涉及文件

- 新建：`supabase/functions/extract-memory-incremental/index.ts`、`supabase/functions/embed-memory/index.ts`
- 修改：`supabase/functions/chat/index.ts`、`supabase/functions/summarize-conversation/index.ts`、`src/pages/Chat.tsx`、`src/lib/streamChat.ts`
- 迁移：新表 `user_profile_facts`、`user_memories` 加 `embedding` 列与 HNSW 索引、`match_user_memories` RPC、`decay_memories` 函数

## 建议执行顺序

1 → 2 → 3 → 4。阶段 1 即可带来最大"懂我"体感；阶段 3 在记忆量 >50 条后才有显著收益，可按用户增长延后。

要从哪个阶段开始？还是按顺序全做？//按顺序全做