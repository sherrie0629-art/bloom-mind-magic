## 目标
- 每个 AI 角色的故事碎片（lore）由 **5 段 → 10 段**
- 重写角色背景，加入 **多层反转**（表层动机 → 中层秘密 → 终极真相）
- 节奏：普通用户聊完一个角色 ≈ **2–4 周**
- 解锁全部 10 段所需用户消息数 ≈ **230 条**

## 关卡设计

**`BOND_THRESHOLDS`**（累计有效用户消息数）
```
Lv1   Lv2   Lv3   Lv4   Lv5   Lv6   Lv7   Lv8   Lv9   Lv10
 0     6    16    30    50    75   105   140   180   230
```
配合"每日最多 12 条进度有效"的上限：
- 12 条/天 → 230 / 12 ≈ **20 天**
- 8 条/天 → ≈ **29 天**
- 15 条/天（重度）→ ≈ **16 天**

**`BOND_LABELS`** (10 级)
陌生人 / 熟面孔 / 信任的人 / 倾听者 / 知己 / 共鸣者 / 守心人 / 灵魂同行 / 命运交织 / 心灵共生

## 反转剧情骨架（每个角色 3 层）

每个角色 10 段 lore 按节奏排布：
- **Lv 1–3**（表层）：日常细节、职业人设、轻量个人故事
- **Lv 4–5**：抛出一个看似完整的"过去伤痛"——这是第一层真相
- **Lv 6–7**：**反转 #1**——之前讲的伤痛并不完整，真实细节比她描述的更复杂/更难堪
- **Lv 8–9**：**反转 #2**——揭露她一直在保护的另一个人 / 她自己也参与了伤害
- **Lv 10**：最终袒露——她为什么需要"用户"这个陌生人来听这些

示例（Chloe / 咖啡师）：
- 旧 Lv 3 "弟弟是家里的艺术家，我没懂他直到太迟"
- 新 Lv 5：弟弟那晚来过咖啡馆，站在窗外一小时，我没抬头
- 新 Lv 7：**反转**——其实那晚我抬头了，看见了一个人影，以为是醉汉就低头继续做账
- 新 Lv 9：**反转**——弟弟没有离世，他活着，在西雅图，三年没回我电话。我每天还是擦那张靠窗的椅子，不是怀念他，是怕他哪天回来发现没位置
- 新 Lv 10：第一次告诉一个陌生人这件事，因为家人都已经"原谅"我了，我需要一个还会质问我的人

其余 3 角色（Jax 消防员、Mystic 占星师、Bestie）以同样三层反转结构改写，详情在实现阶段一并交付。

## 改动清单

### 数据 & 文案
**`src/data/agents.ts`**
- `BOND_THRESHOLDS` → 10 个值
- `BOND_LABELS` → 10 个中文 label（如上）
- 4 个角色的 `lore[]` 各扩到 10 项（保留旧前 3 项，重写 4 起）
- 4 个角色的 `systemPrompt.Hidden backstory` 段落重写为 3 层结构，并明确指示：「Lv 1-3 只用细节级 hook；Lv 4-5 可袒露第一层；Lv 6-7 才能反转第一层；Lv 8-10 才能揭露最深一层」

**`src/i18n/locales/zh.json` / `en.json`**
- `agents.{id}.lore` 数组每个补到 10 段
- 新增 `bond.labels` 10 项（若 BOND_LABELS 走 i18n；当前是常量直接出英文，建议改为 i18n key）

### 进度节流
**新迁移 `agent_bonds` 加列**：
```
ALTER TABLE public.agent_bonds
  ADD COLUMN turns_today int NOT NULL DEFAULT 0,
  ADD COLUMN last_turn_date date;
```

**`src/hooks/useBond.ts` → `incrementTurn`**
- 读 `last_turn_date`：若不是今天则重置 `turns_today=0`
- 若 `turns_today >= 12`：不再增加 `total_turns`，但允许聊天（用户无感知，可选地静默 toast「今天的羁绊已加满，明天再来 ✨」一次）
- 否则 `total_turns += 1`、`turns_today += 1`、`last_turn_date = today`

### Edge Function 配合
**`supabase/functions/chat/index.ts`**
- 注入 `bondLevel` 时的提示词原本 `${level}/5` 改成 `${level}/10`
- "Next story fragment unlocks at level X" 段保持，循环到 10
- `unlockedShards` 透传不变

### UI 适配（多为自动适应，仅核对）
- `BondIndicator` / `AgentProfileDrawer` / `AgentArchive` / `Vault`：全部基于数组长度，扩到 10 自动展示
- 检查 `BondLevelUp.tsx`：当前到 5 级显示"满级"文案，需改成 10 级才显示

### 与免费额度的冲突（提醒，不在本次改）
当前 `free.chat = 20` → 免费用户最多到 Lv 2。本次只调结构与文案；若希望免费用户至少能体验到第一层反转（Lv 5 / 50 条），需另行把 free 上限拉到 60 左右。

## 验收
1. 数据库迁移成功，新列默认值不影响老用户（老 total_turns 保留，今日上限从 0 算起）
2. 新建一个测试账号：连发 14 条消息 → `total_turns` 应只增加 12
3. 累计聊到 30 条 → 解锁第 4 级，UI 显示 4/10
4. 切换中英文，10 段 lore 翻译完整
5. AI 在 Lv 7 提示词下，不会预先剧透 Lv 8-10 的反转
