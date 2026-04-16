

## PC 宽屏布局优化方案

### 现状问题
所有页面都是纯移动端布局（全宽、无 max-width 约束、底部导航占位），在 PC 宽屏上内容拉伸到全屏，聊天气泡和卡片过宽，底部 Tab 栏也不符合桌面习惯。

### 设计思路

采用 **响应式壳（Responsive Shell）** 模式：桌面端用侧边栏导航 + 居中内容区，移动端保持现状不变。

```text
┌─────────────────────────────────────────────────┐
│ Desktop (≥768px)                                │
│ ┌──────────┬────────────────────────────────────┐│
│ │ Sidebar  │  Content Area (max-w-2xl居中)      ││
│ │          │                                    ││
│ │ Home     │  ┌──────────────────────────┐      ││
│ │ Archive  │  │  Page Content            │      ││
│ │ Assess   │  │                          │      ││
│ │ Me       │  └──────────────────────────┘      ││
│ └──────────┴────────────────────────────────────┘│
└─────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Chat Page Desktop (≥768px) — 特殊双栏布局          │
│ ┌──────────┬──────────────┬─────────────────────┐│
│ │ Sidebar  │  Chat (居中)  │ Agent Profile Panel ││
│ │          │  max-w-xl    │ (角色信息/Bond/Lore) ││
│ └──────────┴──────────────┴─────────────────────┘│
└──────────────────────────────────────────────────┘
```

### 具体改动

**1. 新建 `src/components/DesktopLayout.tsx`** — 桌面壳组件
- 检测 `≥768px` 时渲染左侧固定导航栏（Logo + 4 个 nav 项 + 底部用户头像）
- 右侧为 `children` 内容区，带 `max-w-2xl mx-auto` 约束
- `<768px` 时直接渲染 children（移动端不变）

**2. 修改 `src/components/BottomNav.tsx`**
- 桌面端（`≥768px`）隐藏 → `md:hidden`
- 移动端保持不变

**3. 修改 `src/pages/Index.tsx`** — 首页
- 包裹 `DesktopLayout`
- 桌面端 Agent Gallery 改为 4 列网格（`md:grid-cols-4`）
- Hero 区域桌面端横向排列（图文左右分布）
- 评估卡片桌面端可展开为更大卡片

**4. 修改 `src/pages/Chat.tsx`** — 聊天页（重点优化）
- 桌面端：左侧侧栏导航 + 中间聊天区（`max-w-xl`）+ 右侧角色面板（始终可见）
- 右侧面板显示：角色头像/名字/标题、Bond 等级进度、能量值、Lore 解锁列表
- 聊天气泡 `max-w-[75%]` 在桌面端改为 `md:max-w-[60%]`
- 输入框区域桌面端居中对齐，宽度与聊天区一致
- 移动端完全不变（继续用全屏聊天 + 头像点击打开 drawer）

**5. 修改 `src/pages/Assessment.tsx`** — 测评选择页
- 包裹 `DesktopLayout`
- 测评卡片桌面端 2 列 → 更大卡片，带更多描述文字

**6. 修改 `src/pages/AssessmentFlow.tsx` / 其他测评流程页**
- 包裹 `DesktopLayout`
- 问题区域居中 `max-w-lg`
- 结果页桌面端用双栏：左侧 AI 图片 + 右侧维度分析

**7. 修改 `src/pages/DailyTarot.tsx`** — 塔罗页
- 包裹 `DesktopLayout`
- 结果区域桌面端横向排列（卡片左 + 解读右）

**8. 修改 `src/pages/Profile.tsx`** — 个人页
- 包裹 `DesktopLayout`
- 桌面端内容区 `max-w-2xl` 居中

**9. 其他页面**（AgentArchive, Vault, SoulMap, ConversationHistory 等）
- 统一包裹 `DesktopLayout`，内容区加 `max-w` 约束

### 移动端影响
- **零影响**：所有改动通过 `md:` 断点实现，移动端完全保持现有布局
- BottomNav 只加 `md:hidden`，其他不变

### 改动清单汇总

| 文件 | 改动 |
|------|------|
| `src/components/DesktopLayout.tsx` | **新建**：桌面侧栏导航壳 |
| `src/components/BottomNav.tsx` | 加 `md:hidden` |
| `src/pages/Chat.tsx` | 桌面三栏布局：侧栏+聊天区+角色面板 |
| `src/pages/Index.tsx` | 包裹 DesktopLayout，桌面端网格优化 |
| `src/pages/Assessment.tsx` | 包裹 DesktopLayout，卡片 2 列 |
| `src/pages/AssessmentFlow.tsx` | 包裹 DesktopLayout，居中+双栏结果 |
| `src/pages/DailyTarot.tsx` | 包裹 DesktopLayout，横向结果 |
| `src/pages/Profile.tsx` | 包裹 DesktopLayout |
| 其他 8 个页面 | 包裹 DesktopLayout |

