## 问题诊断

当前深度报告渲染存在三大问题：

1. **Tailwind Typography 插件未加载**：`tailwind.config.ts` 的 `plugins` 数组里只有 `tailwindcss-animate`，但 `AssessmentDetail.tsx:398` 大量使用了 `prose prose-sm prose-headings:* prose-p:*` 等 class —— 这些**全部失效**。Markdown 实际只是在用浏览器默认样式渲染，行距、标题层级、列表缩进全部塌陷，看起来像一团裸文本，这是"丑"的根因。
2. **ReactMarkdown 没有自定义组件映射**：`<h2>` `<ul>` `<blockquote>` 等渲染时没有任何品牌化样式（金色分隔、emoji 图标、卡片化分块）。
3. **AI 输出的内容结构本身偏"教科书"**：开头无 hook、章节之间无视觉锚点、缺少可截图分享的金句卡 / 数据看板，用户读完没有"这一页我想发朋友圈"的钩子。

## 优化方案

### 一、版式重构（视觉层）

**1. 启用 Typography 插件 + 自定义品牌主题**
- `tailwind.config.ts` 注册 `require("@tailwindcss/typography")`
- 新增 `prose-mystic` 变体：标题用 `font-display`、`text-gradient-mystic`；段落 `leading-loose`；`blockquote` 改为左侧金色竖线 + 米色卡片底；`hr` 改为渐变细线 + 中央⋄符号。

**2. 自定义 ReactMarkdown components 映射**

每个 `## 章节` 渲染为一张独立卡片（`rounded-2xl bg-card shadow-card p-6`），并把章节里的 emoji（📋🧒💕🛡️💼🌱🔮）抽出，放进左上角的金色圆形徽章里。视觉上从"一长条文档"变成"7 张可分别截图的卡片"。

```text
┌─────────────────────────────┐
│ ⊙ 📋   核心人格画像          │
│ ─────────────                │
│  正文段落，leading-loose…    │
│                              │
│  "金句样式 blockquote"       │
└─────────────────────────────┘
```

**3. 新增"金句卡 / Highlight"组件**
约定 AI 输出 `> 💎 金句内容` 格式 → 前端识别后渲染为 **可单独截图分享**的渐变金色卡片（带"长按保存"按钮，复用 `useSharePoster`）。每章 1 句，作为分享钩子。

**4. 列表强化**
- `ul` → 每项前加 `✦` 金色图标替代默认圆点
- `strong` → 用 `bg-gold/15 px-1 rounded` 高亮（像荧光笔）
- 关键名词（依恋/防御机制名）用斜体 + 下划虚线

**5. 顶部增加"报告封面区"**
在 markdown 渲染前加一个 hero 区：用户类型大字 + 报告生成日期 + 字数 + 阅读时长（按 350 字/分钟估算），类似杂志封面。底部一个"目录"chip 列表（点击锚点跳转章节）。

### 二、内容重构（AI Prompt 层）

修改 `supabase/functions/generate-deep-report/index.ts` 的 system prompt：

1. **每章开头要求 1 个"诊断式 hook"**：例如不写"你的核心特质是…"，写"如果把你比作一种气候，你大概是 ___"。
2. **强制每章包含 1 句 `> 💎` 金句**（≤30 字，可独立分享）。
3. **新增"📊 你的人格雷达"章节**（放在核心画像后）：要求 AI 输出 5-6 个维度的 0-100 分数，前端用一个迷你雷达图/进度条渲染（用纯 CSS bar 即可，不引入图表库）。
4. **结尾 `🔮 总结与展望` 改为"给三年后的你的一封信"**：第二人称、≤200 字，强情绪钩子。
5. **每章末尾追加 `**🎬 行动小任务**：…` 的 1 句可执行动作**，让用户读完就能做。
6. 控制每章字数 400-600，总字数维持 3000-5000。

### 三、分享与留存

- 每张章节卡右上角小图标：📷（保存为图片）/ 🔗（复制章节锚点链接）
- 报告底部新增"分享全报告封面"按钮：复用 `useSharePoster`，生成一张含用户类型 + 金句 + 二维码的竖版海报。

## 涉及文件

- `tailwind.config.ts`（注册 typography 插件 + prose 颜色变量）
- `src/index.css`（新增 `prose-mystic` 自定义样式 / 高亮笔样式）
- `src/pages/AssessmentDetail.tsx`（重写深度报告渲染：封面 + 卡片化章节 + 自定义 components）
- `src/components/DeepReportRenderer.tsx`（**新建**，封装 markdown→卡片渲染、金句卡、雷达条等）
- `supabase/functions/generate-deep-report/index.ts`（更新 system prompt：hook、金句、雷达、行动任务、未来信）
- `src/i18n/locales/{zh,en}.json`（新增章节徽章标题、目录、阅读时长、行动任务等文案）

## 兼容性

历史已生成的 `deepReport`（纯 markdown 字符串）继续可用 —— 新渲染器对所有 markdown 都生效，只是没有金句卡 / 雷达图等增强模块。无需数据迁移，用户重新生成时（每日 1 次额度）即可获得新版内容。

## 推荐执行顺序

1. 先做"版式重构"（一），即使旧报告也立刻变好看；
2. 再做"内容重构"（二），让新报告内容更有钩子；
3. 最后加"分享与留存"（三）。

是否按此方案 1→2→3 一次性执行？或只先做第 1 步快速看效果？