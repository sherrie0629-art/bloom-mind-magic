## 修复选中态导航在深色背景下不可见的问题

### 原因
新黑金主题下 `--secondary: 0 0% 14%`（接近黑），但导航选中态仍写死用 `text-secondary` / `bg-secondary`，于是几乎隐形。应改用主题金色 `primary`（`#c9a84c`）。

### 改动

**`src/components/BottomNav.tsx`**
- 选中态图标和文字：`text-secondary` → `text-primary`
- 顶部小指示条 `bg-gradient-golden` 保持不变（已可见）

**`src/components/DesktopLayout.tsx`**
- 选中态按钮：`bg-secondary/10 text-secondary` → `bg-primary/10 text-primary`
- 左侧竖条指示：`bg-secondary` → `bg-primary`

仅改 2 个文件、共 ~4 行样式类，不动布局与逻辑。
