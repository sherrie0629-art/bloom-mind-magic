

## 全面修复分享与海报功能

### 问题汇总

| 点位 | 问题 |
|------|------|
| **useSharePoster.ts** | `preloadedImageUrl`（Supabase 私有 bucket 签名 URL）用 `crossOrigin="anonymous"` 加载，导致 canvas taint → `toDataURL()` 抛安全错误 → 海报生成失败 |
| **useQuoteCard.ts** | 同样的问题：`loadImage` 函数设置了 `crossOrigin="anonymous"`，加载角色头像可能失败 |
| **DailyTarot.tsx** | 只有 "Save Poster" + PosterPreviewDialog，没有 ShareSheet；海报因 CORS 失败 |
| **CompatibilityDetail.tsx** | 完全没有分享功能，无分享按钮 |
| **AssessmentDetail.tsx** | 已有 ShareSheet，但 `generatePoster` 内部同样受 CORS 影响 |

### 修复方案

**1. `src/hooks/useSharePoster.ts`** — CORS 修复
- 第 63-70 行：`preloadedImageUrl` 改为 `fetch → blob → createObjectURL` 加载方式
- 第 50-56 行：`fetchAIImage` 中的远程图片也用同样方式处理

**2. `src/hooks/useQuoteCard.ts`** — CORS 修复
- `loadImage` 函数（第 138-145 行）改为 `fetch → blob → createObjectURL`

**3. `src/pages/DailyTarot.tsx`** — 接入 ShareSheet
- 导入 `ShareSheet` + `Share2`，移除 `PosterPreviewDialog`
- 添加 `shareOpen` / `shareDataUrl` 状态
- `handleSavePoster` 改为：调用 `generatePoster` → `canvas.toDataURL` → 设置 shareDataUrl → 打开 ShareSheet
- 底部按钮改为 "Save & Share"

**4. `src/pages/CompatibilityDetail.tsx`** — 新增分享
- 导入 `ShareSheet` + `useSharePoster` + `Share2`
- 顶部栏加 Share2 按钮
- `handleShare` 构建配对海报（💕 图标、五维度 bars、总分为 subtitle）
- 底部挂载 ShareSheet

