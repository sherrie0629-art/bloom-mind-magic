

## 创建 SEO 组件并为各页面配置 Meta 标签

### 方案概述
安装 `react-helmet-async`（比 `react-helmet` 更适合 React 18），创建可复用的 `SEO.tsx` 组件，然后在各页面中调用，动态设置 title、description、OG 标签。

### 涉及文件

| 文件 | 操作 |
|------|------|
| `package.json` | 安装 `react-helmet-async` |
| `src/components/SEO.tsx` | **新建** — 通用 SEO 组件 |
| `src/main.tsx` | 包裹 `HelmetProvider` |
| `src/pages/Welcome.tsx` | 添加 SEO 组件，移除手动 `document.title` |
| `src/pages/Index.tsx` | 添加 SEO 组件 |
| `src/pages/Chat.tsx` | 添加 SEO 组件 |
| `src/pages/Assessment.tsx` | 添加 SEO 组件 |
| `src/pages/DailyTarot.tsx` | 添加 SEO 组件 |
| `src/pages/SoulMap.tsx` | 添加 SEO 组件 |
| `src/pages/Auth.tsx` | 添加 SEO 组件 |
| `src/pages/Profile.tsx` | 添加 SEO 组件 |
| `index.html` | 保留基础 fallback meta，清理重复标签 |

### SEO 组件设计

```tsx
// src/components/SEO.tsx
interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
}
```

组件使用 `<Helmet>` 输出 `<title>`、`<meta name="description">`、`<meta name="keywords">`、OG 标签、Twitter Card 标签。所有属性都有合理默认值（品牌名 + 通用描述）。

### 各页面 SEO 配置方案

| 页面 | Title | Description（含关键词） |
|------|-------|------------------------|
| **Welcome** | Soul Sanctuary — AI Emotional Companion & Personalized Soul Maps | AI emotional companion for self-discovery. Personalized soul maps, mental wellness AI, MBTI & Enneagram assessments. Your 24/7 healing space. |
| **Index** | Soul Sanctuary — Your AI Healing Space | Meet AI companions who listen without judgement. Explore personality assessments and build your soul map. |
| **Chat** | Chat — Soul Sanctuary | Talk with your AI companion. A safe, private space for emotional support and self-reflection. |
| **Assessment** | Soul Discovery — Soul Sanctuary | Discover yourself through MBTI, Enneagram, Horoscope & Emotion assessments powered by AI. |
| **DailyTarot** | Daily Tarot — Soul Sanctuary | Draw your daily tarot card for personalized insights and guidance from the universe. |
| **SoulMap** | Soul Map — Soul Sanctuary | Your personalized soul map — a living constellation of insights from every conversation. |
| **Auth** | Sign In — Soul Sanctuary | Join Soul Sanctuary. Start your journey of AI-powered self-discovery. |
| **Profile** | Profile — Soul Sanctuary | Manage your Soul Sanctuary profile and preferences. |

### Welcome 落地页特殊关键词
```
keywords: "AI emotional companion, personalized soul maps, mental wellness AI, 
MBTI assessment, Enneagram test, self-discovery, AI therapy, soul sanctuary"
```

### 技术细节
- 使用 `react-helmet-async` 而非 `react-helmet`，兼容 React 18 严格模式
- `main.tsx` 中用 `<HelmetProvider>` 包裹 `<App />`
- `index.html` 中保留基础 meta 作为 SSR/爬虫 fallback，但移除与页面级 Helmet 冲突的重复 OG 标签
- Welcome 页面移除现有的 `useEffect` + `document.title` 写法

