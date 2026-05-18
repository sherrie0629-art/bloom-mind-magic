## 问题定位

从截图可见，Luna 聊天页头部第二行 "选择了星辰的数据科学家 · 在线 ⭐⭐⭐⭐⭐ Stran..." 被截到屏幕外，右侧露出半个 "Stranger" 字样。

根本原因在 `src/pages/Chat.tsx` 头部副标题行（约 767–770 行）：

- `agent.title` 那段用了 `whitespace-nowrap`，长中文标题（"选择了星辰的数据科学家"）强制不换行；
- 同一 flex 行紧跟 `<BondIndicator />`（5 颗星 + "Stranger" 标签 + 进度条）；
- 两段加起来超出 `flex-1 min-w-0` 容器宽度，但 `whitespace-nowrap` 阻止收缩，于是溢出到右侧，造成内容被裁切，并让整页出现轻微横向滚动。

第一行（agent.name）已经 `truncate`，没事；问题只在第二行 + 缺少全局 `overflow-x` 兜底。

## 改动方案（只动前端展示，不改业务逻辑）

### 1. `src/pages/Chat.tsx` 移动端头部副行重排

把第二行从「单行平铺」改成「标题占满可截断 + 羁绊指示器另起一行」，在 `sm` 以上恢复同行布局：

```
[ArrowLeft] [Avatar] [agent.name ......... 截断]  [+] [⚡5]
                    [agent.title · 在线 (truncate)]
                    [⭐⭐⭐⭐⭐ Stranger ▮▮▮▯▯]   ← 移动端独占一行
```

具体：
- 把 `agent.title · 在线` 那段去掉 `whitespace-nowrap`，改成 `truncate min-w-0 flex-1`；
- 把 `BondIndicator` 用一个外层 `<div>` 包住，移动端 `mt-1`、`sm:mt-0 sm:ml-2`，并整体 `shrink-0`；
- 父容器改成 `flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2`，保证窄屏自动堆叠、宽屏并排。

### 2. 给聊天根容器加横向兜底

第 739 行的 `<div className="flex h-screen flex-col flex-1 ...">` 追加 `overflow-x-hidden min-w-0`，确保任何子元素意外超宽也不会撑出页面。

### 3. 顺手核查同样模式的位置

页面底部输入栏（约 879 行）也是相同 `px-4 py-3` 容器，目前没有 nowrap 长文本，但保险起见检查一遍是否需要 `min-w-0`，若没问题就不动。

## 不在范围内

- 不改 `BondIndicator` 组件内部样式（避免影响桌面侧栏里的另一处用法）；
- 不动 i18n 文案 / agent 数据；
- 不动 SoulMap、Profile 等其它页面，本次只解决聊天页头部。

## 验证

- 把预览切到 mobile（375×812），打开 `/chat?agent=mystic`，确认头部右侧不再被裁、无水平滚动；
- 切到 desktop（≥640px），确认副行恢复同行布局，视觉与现在一致；
- 切换到中文最长 title 的 agent（mystic / sage 等）和英文 locale 各看一次。
