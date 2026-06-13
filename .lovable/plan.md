## 全站主题统一为"夜空鎏金"

### 目标
将首页的黑金配色（`#0d0d0d` 底 / `#c9a84c` 金 / `#f0d78c` 浅金 / `DM Serif Display` + `Fira Sans`）扩展到所有其他页面，保持视觉一致。同时让首页改用统一的设计令牌，避免硬编码值散落各处。

### 策略
**自上而下重写全局设计令牌**，让所有使用 shadcn/语义令牌（`bg-background`、`bg-card`、`text-foreground`、`border-border`、`primary` 等）的页面自动切换主题；再对仍写死浅色样式的页面做最小补丁。

---

### 1. `src/index.css` — 重写 `:root` 令牌为黑金配色

```css
--background: 0 0% 5%;          /* #0d0d0d */
--foreground: 42 70% 75%;       /* #f0d78c */
--card: 0 0% 10%;               /* #1a1a1a */
--card-foreground: 42 70% 75%;
--popover: 0 0% 8%;
--popover-foreground: 42 70% 75%;
--primary: 42 53% 54%;          /* #c9a84c 金 */
--primary-foreground: 0 0% 5%;
--secondary: 0 0% 14%;
--secondary-foreground: 42 70% 75%;
--muted: 0 0% 12%;
--muted-foreground: 42 30% 60%;
--accent: 42 53% 54%;
--accent-foreground: 0 0% 5%;
--destructive: 0 65% 55%;
--border: 42 40% 35% / 0.15      (改用 hsla 形式 → 直接写 #c9a84c26)
--input: 0 0% 16%;
--ring: 42 53% 54%;

--gold: 42 53% 54%;
--gold-light: 42 70% 75%;
--gradient-mystic: linear-gradient(135deg, #1a1a1a, #0d0d0d);
--gradient-golden: linear-gradient(135deg, #c9a84c, #f0d78c);
--gradient-calm: linear-gradient(180deg, #0d0d0d, #141414);
--gradient-card: linear-gradient(145deg, #1a1a1a, #141414);
--shadow-soft: 0 4px 20px -4px rgba(0,0,0,0.5);
--shadow-glow: 0 0 30px -5px rgba(201,168,76,0.35);
--shadow-card: 0 2px 12px -2px rgba(0,0,0,0.4);

--font-display: 'DM Serif Display', serif;
--font-body: 'Fira Sans', 'Inter', sans-serif;
```

同步调整 sidebar 令牌与四个 `chat-theme-*` 工具类的底色为暗色版本（保留各 agent 的强调色相，仅压暗背景）。

### 2. `tailwind.config.ts` — 无需结构性改动
现有 token 已经从 CSS 变量读取，重写 CSS 后自动生效。仅在 `fontFamily.body` 改为 `Fira Sans`。

### 3. `src/pages/Index.tsx` — 改写为使用语义令牌
将硬编码的 `bg-[#0d0d0d]` / `text-[#f0d78c]` / `border-[#c9a84c]/15` 等替换为 `bg-background` / `text-foreground` / `border-primary/15` 等，确保首页与其它页面共用一套真理源。视觉效果保持完全一致。

### 4. 各页面的硬编码浅色清扫
对扫描出的 ~25 个文件批量替换以下模式（不改业务逻辑，只动样式类）：

| 原写法 | 替换为 |
|---|---|
| `bg-white` / `bg-white/…` | `bg-card` / `bg-card/…` |
| `bg-gradient-calm` / `bg-gradient-mystic` 作为页面底色 | `bg-background` |
| `text-foreground` 上的硬色 `text-[#1…]` `text-[#2…]` | `text-foreground` |
| `border-amber-…` `border-stone-…` 等浅边框 | `border-primary/20` |
| 大面积 `from-amber-50 to-orange-50` 渐变背景 | `from-card to-background` |
| 按钮强调色 `bg-amber-500` | `bg-primary text-primary-foreground` |
| 标题色 `text-amber-700` 等 | `text-primary` |

**重点关注页面**（首屏即可见）：`Welcome.tsx` / `Auth.tsx` / `Assessment.tsx` / `AssessmentDetail.tsx` / `DailyTarot.tsx` / `Vault.tsx` / `SoulMap.tsx` / `Profile.tsx` / `Settings.tsx` / `Chat.tsx`（聊天背景已用 `chat-theme-*`，仅压暗即可）。

**保留不动**：
- 角色 agent 的固有强调色（仅在 chat 头部使用）
- 塔罗牌艺术、海报组件等"内容图像"本身的色彩
- `DeepReportRenderer` 的报告排版色（黑金主题下让正文走 `prose-invert`）

### 5. 验证
- 切换 `/`、`/welcome`、`/auth`、`/assessment`、`/daily-tarot`、`/vault`、`/profile`、`/chat`、`/soulmap` 几个核心路由做视觉巡检。
- 检查表单输入、shadcn `Dialog` / `Drawer` / `Toast` 在暗底下的对比度。
- 若发现某些图标/插画在暗底下不可见，单独把 `text-foreground` 提到 `text-primary` 或加 `opacity-90` 微调。

### 不在本次范围
- 不重做布局结构，不引入新动画
- 不动 i18n 文案
- 不动后端、不动 RLS、不动 edge function
