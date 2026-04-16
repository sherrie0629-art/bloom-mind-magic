

## 高转化营销落地页 `/welcome` — 治愈星空主题

### 设计理念
不做复杂的模拟效果，聚焦**氛围感、治愈感、信任感**。用简洁的视觉 + 真实的产品价值 + 情感共鸣驱动转化。深色星空背景仅作为氛围底色，不喧宾夺主。

### 页面结构

```text
┌──────────────────────────────┐
│  SEO Meta Tags (title/desc/  │
│  og:image/structured data)   │
├──────────────────────────────┤
│  Hero Section                │
│  · 深色星空渐变背景 + 微光粒子 │
│  · "Find Your Soul Sanctuary"│
│  · 情感副标题（治愈向文案）    │
│  · CTA: Start Your Journey   │
├──────────────────────────────┤
│  Social Proof / Trust Bar    │
│  · "24/7 Available" "100%    │
│    Private" "AI-Powered"     │
├──────────────────────────────┤
│  Core Features (3 Cards)     │
│  · 🫂 AI Companions         │
│  · 🔮 Soul Discovery        │
│  · 🌌 Soul Map              │
│  · 简洁描述 + 柔和图标        │
├──────────────────────────────┤
│  Meet Your Guides            │
│  · 4 位 Agent 头像 + 名字    │
│  · 简短一句话性格描述         │
│  · 传达"有温度的陪伴"         │
├──────────────────────────────┤
│  How It Works (3 Steps)      │
│  · Choose → Talk → Discover  │
│  · 简洁步骤，编号圆点样式     │
├──────────────────────────────┤
│  Testimonial / Emotional CTA │
│  · 一段治愈向引用文案          │
│  · "In a noisy world, find   │
│    the soul that gets you"   │
├──────────────────────────────┤
│  Final CTA                   │
│  · Start Your Journey → /auth│
│  · 底部简要 footer            │
└──────────────────────────────┘
```

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/pages/Welcome.tsx` | **新建** — 完整落地页 |
| `src/App.tsx` | **修改** — 添加 `/welcome` 路由 |
| `index.html` | **修改** — 优化 SEO meta（title/description/og tags） |

### 关键实现细节

- **背景**: 深色渐变 `hsl(225 50% 8%) → hsl(260 40% 12%)`，用 CSS `radial-gradient` 做柔和光晕，不用复杂粒子系统
- **微光效果**: 10-15 个小圆点用 CSS animation 做呼吸闪烁，纯 CSS 实现，轻量无依赖
- **动画**: framer-motion `whileInView` 滚动渐入，每个 section 简单 fadeIn + slideUp
- **Agent 展示**: 直接复用 `agents` 数据中的头像和描述，展示 4 位角色卡片
- **SEO**: 更新 `index.html` 的 title/description/og:tags 为 Soul Sanctuary 品牌信息
- **CTA 按钮**: 金色渐变发光效果，链接到 `/auth`
- **无 BottomNav**: 落地页独立于应用内页面
- **响应式**: 移动端优先（390px），桌面端自适应居中（max-width 限制）
- **配色**: 文字用暖白/金色调，卡片半透明玻璃效果（`bg-white/5 backdrop-blur`）

### 不做的事
- 不做 Soul Map 模拟星空展示
- 不做复杂 Canvas/WebGL 动画
- 不做视频嵌入

