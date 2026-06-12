## 目标

把首页 `/`（`src/pages/Index.tsx`）从规整宫格升级为"黑金便当·序号杂志"风：暗黑底（#0d0d0d / #1a1a1a） + 鎏金点缀（#c9a84c / #f0d78c） + DM Serif Display 衬线大字 + Fira Sans 正文 + 错落 bento 网格。气质：深夜书房 / 烫金占星杂志，沉静克制，不闪不晃。

## 范围

只改首页。不动：路由、其他页面、AI 后端、i18n key 结构、跳转路径。

## 文件改动

### 1. `index.html`
- 在 `<head>` 引入 Google Fonts：`DM Serif Display` + `Fira Sans` (300/400/500)。

### 2. `src/pages/Index.tsx`（整体重写）
按选中原型 v1 的 5 区便当布局重建，所有 i18n key 复用现有 `home.*`：

```text
┌───────────────────────────────────┬───────────────┐
│ 品牌 Hero（col-8 row-2）           │ 每日塔罗(4×1) │
│ Island AI · 心灵密语 + slogan     ├───────────────┤
│                                   │ 缘分配对(4×1) │
├───────────────────┬───────────────┴───────────────┤
│ 自我探索(6×3)     │ 角色四宫格(6×3)               │
│ MBTI/九型/星座/   │ Chloe / Jax / Luna / Zoe      │
│ 情绪 序号 01-04   │ 头像 + hover 灰→彩            │
├───────────────────┴───────────────────────────────┤
│ 秘密提示横幅（col-12，鎏金左边框）+ 解锁按钮      │
└───────────────────────────────────────────────────┘
```

要点：
- 外层：`bg-[#0d0d0d] text-[#f0d78c] min-h-screen`，container `max-w-6xl` `grid grid-cols-12 grid-rows-6 gap-4`，外间距 `p-6 md:p-12`。
- 每张卡片：`bg-[#1a1a1a] rounded-3xl border border-[#c9a84c]/10 hover:border-[#c9a84c]/40 transition-all`。
- 标题字体用 `font-['DM_Serif_Display']`，正文 `font-['Fira_Sans']`（外层 style 设默认）。
- 品牌区右上加 `radial-gradient` 鎏金辉晕（opacity 40%），底部小字 `ISLANDAI.LIFE / EST 2024`。
- 塔罗/配对卡：标题 + 圆形描边箭头，hover 时按钮翻金。
- 自我探索：内嵌 2×2 子格，每格 `bg-[#0d0d0d]`，左上角 `01-04` 鎏金序号（opacity 40 → hover 100），标题 `MBTI 人格 / 九型人格 / 星座运势 / 情绪压力`。
- 角色 4 宫格：用 `RAW_AGENTS.map(localizeAgent)` 渲染，沿用现有 `image` / `name` / `title`；图片 `grayscale opacity-70`，hover 转彩；保留 `bondLevel` 小角标（5 星缩成鎏金圆点）。
- 秘密横幅：`border-l-4 border-[#c9a84c]`，左侧锁图标 + `t("home.secretsHint")` + `t("home.secretsDesc")`，右侧 "立即解锁" 按钮跳 `/archive`。
- 全部点击行为保留：塔罗→`/daily-tarot`，配对→`/assessment/compatibility`，4 测评→`/assessment/{id}`，4 角色→`/chat?agent={id}`，"全部测评"/"档案"链接保留。
- 顶部 `DesktopLayout maxWidth="4xl"` 改为 `"full"` 以适配 6xl 容器（侧边栏不变）。
- Hero 背景图 `hero-bg.webp` 移除（与暗主题不符），改为纯色 + 金色 radial glow。
- `framer-motion`：保留入场 `initial/animate`，hover 改为 `whileHover={{ y: -2 }}`，删除原 `Stars/Sparkles` 等花哨图标，仅保 `Lock` / `ArrowRight` / `Heart` 等克制线性图标。
- 移除底部 `BottomNav` 在桌面端的视觉冲突（保留 mobile）。

### 3. 不动
- `BottomNav`、`DesktopLayout` 文件本身保持原样（只改 prop）。
- `agents.ts` / `localizeAgent.ts` 数据层不动。
- i18n 文案不新增（"立即解锁"按钮文字直写中文常量即可，符合现有 mixed 风格；若需 i18n 后续再补）。

## 技术备注

- 颜色采用 Tailwind 任意值 `[#hex]`，因为这是单页戏剧化暗主题，与全局 `bg-card / text-foreground` 等浅色主题语义冲突，硬塞 token 会污染其他页面。范围已局部化，可控。
- 字体通过 `style={{ fontFamily }}` + `font-['DM_Serif_Display']` 在该页生效，不影响全局 Tailwind `font-display` 配置。
- 移动端：`grid-cols-1` 自然回退为单列堆叠；4 角色变 2×2；侧边栏在 mobile 隐藏由 `DesktopLayout` 处理；`BottomNav` 仍显示。

## 验收

- 视觉与选中原型 v1 一致：暗金、衬线、便当错落。
- 所有现有跳转 & bondLevel 数据正常。
- 桌面 1440 与移动端均不破。
