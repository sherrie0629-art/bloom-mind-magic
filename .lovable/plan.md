## 目标

让用户可在中文 / 英文之间切换界面语言，入口放在"我的 → Settings"中，选择后立即生效并持久化（刷新后保留，跨设备登录可同步）。

---

## 方案概览

1. 引入 `react-i18next` + `i18next` 作为多语言基础设施
2. 新建 `/settings` 页面，作为后续设置项的统一入口（首发功能：语言切换）
3. 把 Profile 中"Settings"菜单项接到 `/settings`
4. 首批接入翻译的界面：BottomNav、Profile、Settings、SiteFooter、AuthPromptDialog 等高频可见区域；其余页面后续逐步迁移（保留英文 fallback，不影响显示）
5. 语言偏好存储：`localStorage`（首选）+ 登录用户写入 `profiles.locale`（可选同步），下次登录自动应用

---

## 改动清单

### 新增依赖
- `i18next`、`react-i18next`、`i18next-browser-languagedetector`

### 新增文件
- `src/i18n/index.ts` — i18next 初始化（默认按浏览器语言检测，fallback 英文）
- `src/i18n/locales/zh.json` — 中文翻译资源
- `src/i18n/locales/en.json` — 英文翻译资源
- `src/pages/Settings.tsx` — 设置页：
  - 顶部返回按钮 + 标题"设置 / Settings"
  - "界面语言 / Language" 卡片，提供两个选项（中文 / English），当前选中高亮
  - 切换后即时调用 `i18n.changeLanguage()`，写 `localStorage`，已登录则更新 `profiles.locale`
- `src/hooks/useLocale.ts` — 封装当前语言读取、切换、与 Supabase 同步逻辑

### 修改文件
- `src/main.tsx` — `import "./i18n"` 提前初始化
- `src/App.tsx` — 注册 `/settings` 路由
- `src/pages/Profile.tsx` — Settings 菜单项 `action` 改为 `navigate("/settings")`；常用文案接入 `useTranslation`
- `src/components/BottomNav.tsx` — 标签文案接入翻译
- `src/components/SiteFooter.tsx` — 链接文案接入翻译
- `src/contexts/AuthContext.tsx` — 登录后读取 `profiles.locale` 应用到 i18n（如有）

### 数据库（可选同步，推荐）
- 给 `public.profiles` 增加 `locale text default 'en'` 字段（migration）
- 默认 `en`，已有行不影响；写入受现有 RLS 约束（用户只能改自己）

---

## 翻译范围（首批）

为避免一次性改动过大，先翻译以下高频可见文案，其它页面保持英文，后续逐步补全：

- 底部导航（Home / Archive / Assess / Me）
- Profile 页：Sign In/Sign Up、Sign Out、Plus 卡片标题与按钮、Reports/Vault/Chemistry/Notifications/Settings/Admin 菜单
- Settings 页全部文案
- SiteFooter 链接
- 通用按钮（确认 / 取消 / 保存 / 返回）

未翻译的页面会自然显示英文 key 的 fallback 文案（即原英文），用户体验上不会出现缺字。

---

## 技术细节

### i18n 初始化（`src/i18n/index.ts` 草图）
```ts
i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { en: { translation: en }, zh: { translation: zh } },
  fallbackLng: "en",
  supportedLngs: ["en", "zh"],
  detection: {
    order: ["localStorage", "navigator"],
    lookupLocalStorage: "app.locale",
    caches: ["localStorage"],
  },
  interpolation: { escapeValue: false },
});
```

### 切换逻辑
```ts
async function setLocale(lng: "en" | "zh") {
  await i18n.changeLanguage(lng);
  localStorage.setItem("app.locale", lng);
  if (user) await supabase.from("profiles").update({ locale: lng }).eq("user_id", user.id);
}
```

### Settings 页 UI（沿用项目现有卡片样式 / Tailwind tokens）
```text
┌─ ← 设置 / Settings ───────────────┐
│                                    │
│  界面语言 / Language               │
│  ┌────────────┐  ┌────────────┐   │
│  │ ✓ 中文      │  │   English   │   │
│  └────────────┘  └────────────┘   │
│                                    │
│  （后续可加：通知、主题、账号…）    │
└────────────────────────────────────┘
```

---

## 不在本次范围

- 全站所有页面文案的完整中文化（量大，建议下个迭代分模块迁移）
- AI 回复语言切换（chat / assessment 报告内容由后端 prompt 控制，需另行处理）
- RTL 语言支持

如需把 AI 输出语言也跟随界面语言，请在审批后告知，我会在 chat / assessment edge function 的 prompt 中读取用户 locale 并相应调整。
