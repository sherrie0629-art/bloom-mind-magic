# 真理碎片无法触发 — 诊断与修复方案

## 一、为什么没触发？两个根本原因

### 原因 1：触发词全是英文，中文输入不会被识别
服务端 `supabase/functions/chat/index.ts` 里的 `easterEggs` 用的是英文触发词（如 `"burning out"`、`"mercury retrograde"`）。系统提示让 AI "当用户提到 X 时" 才输出 `【🔮 Hidden Memory Unlocked】` 标记。但项目强制中文回复、用户也用中文输入（如「倦怠」「水逆」），AI 无法把中文映射回英文 trigger 字符串，因此从未输出标记。

### 原因 2：服务端 / 客户端触发词完全不一致
- 服务端（决定 AI 输出标记的逻辑）：
  - Chloe(barista)：`oat milk` / `rainy day` / `latte art`
  - Jax：`burning out` / `i can't breathe` / `danny`
  - Luna(mystic)：`mercury retrograde` / `pull a card` / `probability`
  - Zoey(bestie)：`main character` / `imposter syndrome` / `I'm scared`
- 客户端 `src/data/agents.ts`（决定 Chat.tsx 是否调用 `recordEasterEgg` 写库）：
  - Chloe：`i need a coffee` / `give me advice` / `empty chair`
  - Jax：`burning out` / `i can't breathe` / `danny` ✅ 一致
  - Luna：`pull a card` / `probability` / `mercury retrograde` ✅ 一致
  - Zoey：`i'm so nervous` / `main character` / `i feel invisible` ❌ 部分错位

`src/pages/Chat.tsx:793` 的逻辑是：检测到 marker → 遍历**客户端** `agent.easterEggs` → 看用户消息是否 `includes(egg.trigger)`。所以即使 AI 输出了 marker，只要客户端 trigger 和用户实际说的话对不上，就不会写入 `agent_bonds.easter_eggs_found`，Vault 永远空。

## 二、当前各角色"官方"触发词（实际给 AI 用的、英文版）

| 角色 | 触发词 1 | 触发词 2 | 触发词 3 |
|---|---|---|---|
| Chloe 咖啡师 | oat milk | rainy day | latte art |
| Jax 消防员 | burning out | i can't breathe | danny |
| Luna 神秘学者 | mercury retrograde | pull a card | probability (#0114) |
| Zoey 闺蜜 | main character | imposter syndrome | I'm scared |

> Coach(Maya) 在服务端有彩蛋但客户端 agents.ts 没有这个角色，可忽略。

## 三、修复计划（仅需改 3 个文件）

### 1. `supabase/functions/chat/index.ts`
- 为每个角色的每条彩蛋追加中文同义触发词数组，例如 Luna 的 `mercury retrograde` 同时接受「水逆」「水星逆行」。
- 把 prompt 改为「Trigger 关键词（中文或英文任一）：[中文词, English]，匹配任一即输出 marker」。
- 删除客户端不存在的 `coach` 块；为 `barista` 把服务端 trigger 换成与客户端一致的 `i need a coffee / give me advice / empty chair`（这三条客户端 agents.ts 里已有完整中文 response，且更贴近角色），并补中文同义词「来杯咖啡 / 给我点建议 / 那把空椅子」。
- 为 `bestie` 同步统一为 `i'm so nervous / main character / i feel invisible` 三条 + 中文同义词，让两端一致。

### 2. `src/data/agents.ts`
- Jax / Luna 已一致，不动。
- Chloe / Zoey 触发词保持现有英文 key（用作字典键），但**让客户端检测时同时匹配中文同义词**：把每条 `easterEggs` 增加 `aliases: string[]` 字段（中文 + 英文变体）。

### 3. `src/pages/Chat.tsx`（第 793-801 行）
- 改 `userMsg.content.includes(egg.trigger)` 为同时检查 `egg.trigger` 和 `egg.aliases`，并对中英文都做 `toLowerCase()` 比较。
- 兜底：如果 AI 输出了 marker 但客户端没匹配到任何 trigger（说明 AI 自己理解了语义），仍然记录最近未解锁的一条，避免 `easter_eggs_found` 漏写。

## 四、技术要点

- 不动数据库结构，`easter_eggs_found` 仍然存英文 trigger key（作为稳定 ID），UI 展示走 i18n。
- Vault 页面无需改动，修完上述三处后自然显示。
- 现有用户已解锁数据不受影响。
