## 问题定位

用户在桌面视口（1388px）看到的首页左侧菜单仍是英文（Home / Archive / Assess / Me）。原因：

- `src/components/BottomNav.tsx` 已用 `t("nav.home")` 等键，移动端正常。
- 但 `src/components/DesktopLayout.tsx` 中的 `navItems` 是模块级常量，标签硬编码为英文字面量（"Home" / "Archive" / "Assess" / "Me"），同时 logo 区 "Soul Sanctuary" / "Your AI Healing Space" 也是硬编码英文。

桌面端用 `DesktopLayout` 的侧边栏，所以无论 locale 设为什么都显示英文。

## 修复方案

修改 `src/components/DesktopLayout.tsx`：

1. 引入 `useTranslation`，把 `navItems` 移到组件内部，label 改用 `t("nav.home" | "nav.archive" | "nav.assess" | "nav.me")`（这些键 `BottomNav` 已在用，`zh.json` / `en.json` 已存在，无需新增）。
2. logo 区文案改用翻译键：
   - `t("home.appName")` 替换 "Soul Sanctuary"
   - 新增 `home.appTagline` 键（zh: "你的 AI 疗愈空间"；en: "Your AI Healing Space"）替换副标题。
3. 顺手核查 `home.appName` 当前在 zh.json 是否为中文（首页 H1 已用它且显示正常，应已 OK）。

## 范围

- 修改：`src/components/DesktopLayout.tsx`
- 修改：`src/i18n/locales/zh.json`、`src/i18n/locales/en.json`（新增 `home.appTagline`）

## 验证

切换到中文：桌面侧边栏显示「首页 / 档案 / 测评 / 我的」+ 中文副标题；切回英文恢复原样。
