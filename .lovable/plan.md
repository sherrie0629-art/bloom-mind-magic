## 问题定位

`src/pages/Chat.tsx` 第 47-56 行的 `isTarotDrawIntent` 正则过于宽松：

- `/(抽|来|给我).{0,8}(张|一张|牌|塔罗)/` 会把"刚才**抽**的那张**牌**"判为抽牌意图
- `/塔罗牌/` 会把任何提到"塔罗牌"的句子都当成抽牌

所以用户说"说回头聊一聊刚才抽的那张牌"时，Luna 又抽了一张新牌。

## 修复方案

### 1. 收紧意图判定 `src/pages/Chat.tsx` (`isTarotDrawIntent`)

加入"回顾性语境"黑名单 + 要求出现"祈使/未来"信号：

- **黑名单**（命中即视为不是抽新牌）：`刚才|刚刚|之前|上次|那张|这张|那张牌|刚抽|已经抽|解读|讲讲|聊聊|说说|再说|回头|分析一下|什么意思|代表` 等
- **英文黑名单**：`just drew|earlier|previous|that card|this card|the card|what does .* mean|interpret`
- **中文白名单**（祈使）：`帮我抽|给我抽|再抽|抽一张|抽张|抽个|来一张|来张|开一张|为我抽`；裸 `抽牌/抽塔罗` 需要在句首或后面没有"的/了/过"指代
- **英文白名单**：`\b(draw|pull|give me|pick)\s+(a|me|another)?\s*(new\s+)?(card|tarot)\b`、`new tarot|another card`

策略：先匹配白名单 → 再用黑名单一票否决 → 都不命中则 `false`。

### 2. 让 Luna 知道"刚才那张牌"是谁

当判定为非抽牌但用户明显在追问历史抽牌（命中黑名单中的回顾词 + 含"牌/card"），在 `apiMessages` 末尾追加一段 `lastCardContext`：

- 倒序扫描 `messages`，找到最近一条 `kind === "tarot-card"` 且 `tarotCard` 非空的消息
- 拼接：`[上一张牌回顾：用户此前抽到 {cardNameCn}（{正/逆位}），关键词：{keywords}。请围绕这张牌继续解读，不要再抽新牌。]`（英文对应版本）
- 若找不到历史牌，则不附加，让模型按普通对话回复

### 3. 验证清单

- "说回头聊一聊刚才抽的那张牌，力量代表什么意思？" → 不抽新牌，Luna 围绕"力量"解读
- "那张牌什么意思？" → 不抽新牌
- "帮我抽一张牌" / "再抽一张" → 正常抽牌
- "draw me a card" / "pull another tarot" → 正常抽牌
- "what does this card mean" → 不抽新牌

## 涉及文件

- `src/pages/Chat.tsx`（仅前端逻辑，无需后端/迁移改动）
