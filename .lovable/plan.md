## 目标

在深度报告底部新增"分享与留存"模块，让用户读完想发朋友圈：
1. **每张章节卡右上角**：📷 截图保存按钮 + 🔗 复制章节锚点链接按钮
2. **报告底部**：「分享报告封面」按钮 → 生成竖版海报（含类型 + 标志性金句 + 站点名）
3. **分享文案**预填用户类型 + 第一句金句

## 实施步骤

### 1. 安装依赖
`html-to-image`（已 `bun add` 完成）—— 用于把单个章节卡 DOM 截成 PNG，比 html2canvas 更轻、对 motion/渐变兼容更好。

### 2. 改造 `src/components/DeepReportRenderer.tsx`

**新增 imports**
```ts
import { useMemo, useRef, useState } from "react";
import { Camera, Link as LinkIcon, Share2, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { useSharePoster } from "@/hooks/useSharePoster";
import ShareSheet from "@/components/ShareSheet";
```

**章节卡右上角工具栏**
- 用 `useRef<HTMLDivElement[]>([])` 存每张卡的 DOM 引用（`ref={(el) => (sectionRefs.current[i] = el)}`）
- 📷 按钮：`toPng(sectionRefs.current[i], { pixelRatio: 2, backgroundColor: "#faf6ee" })` → 触发下载 `深度报告-{章节名}.png`，并同时打开 `ShareSheet` 让移动端可"长按保存/分享"
- 🔗 按钮：`navigator.clipboard.writeText(${location.href}#deep-section-${i})` → toast 提示"链接已复制"
- 截图前临时把"工具栏"自身 `display: none`（避免按钮被截进图），完成后恢复

**报告底部「分享报告封面」按钮**
- 用 `useSharePoster().generatePoster()` 生成竖版海报：
  ```ts
  generatePoster({
    title: typeLabel,
    subtitle: t("assessmentDetail.deepCoverTag"),
    description: firstQuote || coverSubtitle,  // 用第一句 💎 金句作主文案
    bars: [],                                   // 深度报告不展示维度条
    accentColor: "#8b5cf6",
    accentColorLight: "#c4b5fd",
    icon: "📜",
    caption: t("assessmentDetail.deepShareCaption"),
    extraLines: topQuotes,  // 最多 2-3 条金句，作为亮点列表
  })
  ```
- 从 markdown 中提取所有 `> 💎 …` 行作为 `topQuotes`（按出现顺序取前 3 条）
- 海报通过 `<ShareSheet>` 弹层呈现（与项目其他分享一致，复用现成组件）

### 3. i18n 新增 key（`zh.json` / `en.json`，置于 `assessmentDetail` 命名空间）

| key | zh | en |
|---|---|---|
| `deepShareSection` | 截图本章 | Save section |
| `deepCopyLink` | 复制链接 | Copy link |
| `deepLinkCopied` | 章节链接已复制 ✨ | Section link copied ✨ |
| `deepSharePoster` | 生成报告海报 | Generate report poster |
| `deepShareCaption` | 在心灵密语探索属于你的内在地图 ✨ | Discover your inner map at Mind Garden ✨ |
| `deepSectionSaved` | 已保存到相册 / 可长按图片转发 | Saved · long-press to share |
| `deepSaveFail` | 截图失败，请重试 | Save failed, please retry |

### 4. 兼容性 / 边界
- `html-to-image` 在 Safari 上对 `backdrop-blur` 有时丢失，截图前对相关元素加 `data-html2canvas-ignore` 兜底（这里只对工具栏按钮用即可）
- 截图过程中按钮显示 `<Loader2 className="animate-spin" />`，期间禁用避免重复触发
- 历史报告（无 💎 金句）：海报 `description` 退回封面副标题，`extraLines` 留空，不报错

## 涉及文件

- `src/components/DeepReportRenderer.tsx`（核心改动）
- `src/i18n/locales/zh.json`、`src/i18n/locales/en.json`（新增 7 个 key）
- `package.json` / `bun.lockb`（已加 `html-to-image`）

## 不做的事
- 不引入二维码（`useSharePoster` 当前未画二维码；如要加，需后续单独迭代海报模板）
- 不持久化"分享次数"统计（避免新增表/字段）
- 不为旧版（无金句）报告倒灌内容