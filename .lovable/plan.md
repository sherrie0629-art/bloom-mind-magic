# i18n 键缺失修复

## 扫描结果

对全站 412 个 `t("...")` 调用做了 key 完整性核查（脚本：扫描 `src/**/*.{ts,tsx}` 与 `src/i18n/locales/{zh,en}.json`）。

仅发现 1 处问题：

- `home.bondLabels`：在 `src/pages/Chat.tsx` 中被当作字符串数组使用（`returnObjects: true`），但 zh.json / en.json 中实际是对象（含 `stranger/acquaintance/trusted/close/soulbound` 五个子键）。运行时会拿到 `[object Object]` 索引值。

其余 411 个键均在中英两份 locale 文件中都有对应翻译，无遗漏。

## 修复方案

修改 `src/pages/Chat.tsx` 第 699 行与第 810 行，把数组下标读取改为按子键读取，复用现有 `home.bondLabels.{stranger|acquaintance|trusted|close|soulbound}`：

```ts
const BOND_KEYS = ["stranger","acquaintance","trusted","close","soulbound"] as const;
// 渲染时：
t(`home.bondLabels.${BOND_KEYS[bondLevel - 1] ?? "stranger"}`)
```

不需要新增任何翻译键。

## 影响

- Chat 页顶部能量提示与右侧抽屉的"羁绊等级"标签恢复正常的中/英文显示。
- 其余页面无需改动。
