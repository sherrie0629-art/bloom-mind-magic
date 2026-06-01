## 目标

两张角色卡当前共用同一组快捷标签（嘴硬心软 / e人外表i人内心 / 松弛感拉满），重复且单调。给两边各自一组主题不同、互有反差的标签，让填写更像“贴标签游戏”。

## 改动

仅 UI / 文案，不改后端字段与提交结构。

### 1. `src/i18n/locales/zh.json` & `en.json`

在 `assessmentFlow.compatibility` 下新增两组标签，每组 5 个，删除/保留原 `traitChip1-3`（保留以防其他引用）。

**我方（自我吐槽向 · 偏 i / 内省）**
- 嘴硬心软
- e人外表i人内心
- 松弛感拉满
- 容易上头
- 嘴笨但很真诚

**对方（观察 TA 向 · 偏外貌 + 谜语）**
- 笑起来犯规
- 神秘感拉满
- 永远慢半拍
- 情绪稳定到离谱
- 像只难驯服的猫

英文对应翻译保持同款轻俏感。

### 2. `src/pages/CompatibilityFlow.tsx`（仅第 333-355 行附近）

- 把 `["traitChip1","traitChip2","traitChip3"]` 改为根据 `isMine` 选择不同 key 数组：
  - mine → `["traitMine1"..."traitMine5"]`
  - them → `["traitThem1"..."traitThem5"]`
- 标签更多时，外层 `flex-wrap` 已能换行，无布局变化。
- 顺手在两组上方各加一个极小的提示前缀（"快捷词：" / "TA 像："）以加强差异感，i18n key 复用现有 placeholder 思路新增 `chipHintMine` / `chipHintThem`。

### 3. 不变

- 提交 payload、`myTraits`/`partnerTraits` state、字符拼接逻辑（`、` 连接）保持原样。
- 其他卡片样式、动画、LV 徽章、MBTI / 星座 选择器均不动。

## 视觉示意

```
[我方 LV.??]                 [对方 LV.??]
快捷词:                       TA 像:
+嘴硬心软  +e外i内              +笑起来犯规  +神秘感拉满
+松弛感拉满 +容易上头           +永远慢半拍  +情绪稳定到离谱
+嘴笨但真诚                    +像只难驯服的猫
```
