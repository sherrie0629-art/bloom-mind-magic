## 目标

让「藏宝匣」三个 Tab 都能正确反映用户的实际解锁进度，而不是永远显示空。

## 改动范围

只改一个文件：`src/pages/Vault.tsx`。不动数据库、不动 Chat 逻辑、不动 agents 数据。

### 1. 故事碎片（lore）Tab —— 改数据源

不再从 `story_vault` 读取（那里永远没有 lore 行），改成：

- 复用 `agents.ts` 里每个角色的 `lore[]` 数组（已在 `AgentArchive` 使用）。
- 用已经加载的 `agent_bonds.bond_level` 判断哪些 lore 条目已解锁（`level <= bond_level`）。
- 按角色分组渲染，每条解锁的 lore 展示：角色头像/渐变色、等级标签（如「Lv.3 知己」）、lore 文本。
- 未解锁的条目用灰色 + 锁图标占位，并提示「再聊 X 句解锁」（沿用 `BOND_THRESHOLDS`）。
- 顶部加一句小字说明：「故事碎片会随着你与角色的羁绊等级提升自动解锁。」

### 2. 真理碎片（truth_shard）Tab —— 改进空状态提示

当前的「真理画廊」视图保留不动（按角色显示彩蛋槽位），但当用户**一个真理碎片都没有解锁时**，在画廊顶部加一个温和的提示卡片：

> 💡 真理碎片需要在聊天中说出特定的"暗号"才能解锁。每个角色都有几个隐藏关键词，试试在对话里聊起 TA 最在意的话题吧。

这样用户不会以为是 Bug。

### 3. 金句（quote）Tab —— 暂时隐藏

目前没有任何代码写入 quote 类型，留着只会让人困惑。在 `TABS` 数组里临时移除 `quote` 项（保留 i18n key，方便未来恢复）。

## 不做的事

- 不新建表、不加 migration、不动 RLS。
- 不改 Chat.tsx 的 truth shard 写入逻辑。
- 不改 AgentArchive 页面。
- 不补写历史 lore 到 `story_vault`（没必要，直接从 agents 数据派生即可）。

## 技术细节

- `Vault.tsx` 已经在加载 `agent_bonds`，新增逻辑只需把现有 `bonds` map 扩展为 `{ agent_id: { eggs: string[], level: number } }`，或单独再存一个 `levels` map。
- 复用 `AgentArchive` 里的 `BOND_THRESHOLDS` 和 `bondLabels` i18n key，无需新增翻译。
- 需要为新增的小提示加 2 条 i18n key：`vault.loreHint`、`vault.truthHint`（zh + en）。

## 验证

- 用当前账号打开藏宝匣 → 故事碎片 Tab 应能看到 4 个角色已解锁的 lore 文本（bestie 5 条全开、mystic/jax 4 条、barista 3 条）。
- 真理碎片 Tab 顶部出现解释卡片，下方画廊依旧全锁。
- 金句 Tab 消失。
