
将首页 hero 区域的 logo 文字从 "Soul Sanctuary" 改为 "Island AI"，与底部 footer 的 "© Island AI" 品牌一致。

### 改动范围

**1. `src/pages/Index.tsx`（第 64 行）**
- Hero 标题：`Soul Sanctuary` → `Island AI`
- 副标题保留 "In a noisy world, find the soul that gets you"（贴合 Island AI 安静港湾的品牌感）

**2. `src/components/SEO.tsx`（第 4 行）**
- `SITE_NAME` 常量：`"Soul Sanctuary"` → `"Island AI"`
- 这会自动更新所有页面默认 `<title>` 后缀和 `og:site_name`

**3. `src/pages/Index.tsx`（第 56 行 SEO 调用）**
- `title="Soul Sanctuary — Your AI Healing Space"` → `title="Island AI — Your AI Healing Space"`

**4. `index.html`**
- `<title>Soul Sanctuary — AI Companions for Self-Discovery</title>` → `Island AI — AI Companions for Self-Discovery`
- `<meta name="author" content="Soul Sanctuary" />` → `Island AI`
- `og:title` 和 `twitter:title` meta 标签同步更新

### 不会改动
- Footer（已经是 "Island AI"）
- Contact 页面（已经是 "Island AI"）
- 数据库、品牌色、logo 图标、agent 数据
- 中文文案（项目内 UI 固定文案为英文，符合现有规则）

### 验证
刷新首页 → hero 显示 "Island AI"；浏览器标签页标题显示 "Island AI — ..."；底部 footer 与顶部 logo 品牌一致。
