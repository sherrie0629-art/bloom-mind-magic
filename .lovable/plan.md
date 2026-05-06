## 是 bug

`src/i18n/locales/{zh,en}.json` 已经定义了完整的 `dailyTarot.*` 翻译键（title / subtitle / focus / drawBtn / drawing / reversed / upright / energy / todayReading / saveShare / generatingArt / artFail / drawFail / posterIntro / posterFail / shareText / loading），但 `src/pages/DailyTarot.tsx` 完全没有接入 `useTranslation`，所有展示文本和 toast 都是英文硬编码字面量。

## 修复

只改 `src/pages/DailyTarot.tsx`：

1. 引入 `useTranslation`，在组件内 `const { t } = useTranslation();`
2. 替换所有英文字面量为对应翻译键：
   - 头部 `Daily Tarot` / `Draw a card · Discover today's insight` → `t("dailyTarot.title")` / `t("dailyTarot.subtitle")`
   - idle 区域 `Focus your mind...` / `Draw Today's Card` → `focus` / `drawBtn`
   - drawing `Reading the cards...` → `drawing`
   - 结果区 `Reversed` / `Upright`、`Energy {n}/5` → `reversed` / `upright` / `energy` (带 `{n: result.energyScore}` 插值)
   - 牌面图状态 `Generating card art...` / `Card art unavailable` → `generatingArt` / `artFail`
   - `Today's Reading` / `Save & Share` → `todayReading` / `saveShare`
   - loading fallback `Loading...` → `loading`
   - toast：`Generating your poster…` → `posterIntro`；`Failed to generate poster` → `posterFail`；`Failed to draw...` → `drawFail`
   - ShareSheet text `Discover your daily tarot insight ✨` → `shareText`
3. SEO 标题/描述同样切到翻译键（复用 `dailyTarot.title` + 现有 `home.tagline`，或新增 `dailyTarot.seoDesc`；为简洁直接复用 title + subtitle）。
4. `promptLogin("Sign in to draw your daily tarot card")` 这一行的英文是传给登录提示对话框的，沿用现有 `auth.*` 体系即可——若已有键则用，否则保留兜底（不阻塞主修复）。

## 范围

- 修改：`src/pages/DailyTarot.tsx`
- 不动：i18n JSON（键已齐全）

## 验证

切换到中文 locale，进入 `/daily-tarot`：标题、按钮、状态文案、toast 全部显示中文；切回英文恢复原样。
