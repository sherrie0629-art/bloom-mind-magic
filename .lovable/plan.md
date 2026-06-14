## 问题诊断
Chat 页面（`src/pages/Chat.tsx` 第 924–945 行）自己写了一个桌面侧边栏，使用了 emoji 图标（🏠📖✨👤）和与 `DesktopLayout` 不同的样式（无 active 高亮指示条、无 layoutId 动画、icon 是 emoji 而非 lucide）。

而首页等其它页面统一使用 `src/components/DesktopLayout.tsx`，导航 icon 是 lucide 的 `Home / BookOpen / Sparkles / User`，并带左侧高亮指示条与 active 状态。

因此用户在 Chat 页看到的侧边栏与首页风格不一致。

## 修复方案
统一让 Chat 页复用 `DesktopLayout` 的侧边栏样式。

### `src/pages/Chat.tsx`
- 删除当前自定义的 `<aside>...</aside>` 侧边栏（第 927–945 行）。
- 改为复用与 `DesktopLayout` 完全一致的侧边栏渲染：
  - lucide 图标：`Home / BookOpen / Sparkles / User`
  - 同样的容器、padding、active 高亮（`bg-primary/10 text-primary` + 左侧 `motion.div` 指示条 `layoutId="desktop-nav-indicator"`）
  - 顶部 logo 改回首页一致的 `t("home.appName")` + `t("home.appTagline")`（而非 `chat.headerTitle/headerSub`），保证整站统一。
- 保留 Chat 页其它布局（外层 `md:ml-[220px]`、聊天内容区）不变。

### 备选简化
为避免重复代码，也可以把 Chat 页直接套在 `DesktopLayout maxWidth="full"` 里。但 Chat 页有自己的 `h-screen flex flex-col`、动态背景与 sticky 输入框，套用现成 `DesktopLayout` 可能会破坏滚动行为。所以本次只在 Chat 内联复制一份与 DesktopLayout 完全一致的侧边栏 JSX，最小风险。

## 验证
- 进入 `/chat?agent=bestie`，桌面端左侧栏 icon 应变为 lucide 线性图标，与首页完全一致；当前页面（聊天页不属于四个 tab）则四项均无 active 态，与首页跳到非 tab 页时表现一致。