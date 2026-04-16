

## 北美 H5 分享方案分析与优化

### 平台限制（关键事实）

**Web Share API（当前 "Share" 按钮使用的）**：
- ✅ iOS Safari / Android Chrome 均支持，点击后会弹出系统级分享面板，用户可以选择 iMessage、WhatsApp、Instagram Stories、Snapchat 等已安装的 App
- ✅ 带 `files` 参数时可以直接分享图片文件——**这已经是 H5 能做到的最佳路径**
- ❌ 无法跳过系统面板直接打开某个 App（这是 OS 级限制，任何网页都做不到）

**各渠道 Deep Link 能力**：

| 渠道 | 网页直接分享可行性 | 说明 |
|------|------------------|------|
| Instagram | ❌ 无 Web API | Instagram 不提供任何网页端分享接口，只能通过系统分享面板或用户手动操作 |
| Pinterest | ✅ Pin It URL | `https://pinterest.com/pin/create/button/?url=...&media=...&description=...` 可以弹窗创建 Pin |
| X/Twitter | ✅ Intent URL | `https://twitter.com/intent/tweet?text=...&url=...` |
| Facebook | ✅ Sharer URL | `https://www.facebook.com/sharer/sharer.php?u=...` |
| iMessage | ✅ 系统分享面板自动包含 | — |
| WhatsApp | ✅ URL Scheme | `https://api.whatsapp.com/send?text=...` |

### 北美用户分享习惯洞察

1. **Instagram Stories** 是 Z 世代/千禧用户最高频分享渠道，但只能通过系统分享面板触达
2. **iMessage** 是 iOS 用户（北美 ~55% 市占）最自然的分享方式，系统面板第一选项
3. **Pinterest** 适合视觉型内容（塔罗卡、性格海报），北美月活 4.5 亿，女性用户为主
4. **X/Twitter** 适合测评结果的文字+链接分享，病毒传播潜力大
5. **Copy Link** 是万能 fallback，用于 Discord/Reddit 等无法直接 deep link 的平台

### 优化方案

**改造 `ShareSheet.tsx`**，分两层：

**第一层：优先触发系统分享（移动端）**
- 检测移动端时，"Share" 按钮作为首选项且视觉突出（大按钮）
- 调用 `navigator.share({ files, title, text, url })` 弹出系统面板
- 系统面板已包含 Instagram Stories、iMessage、WhatsApp 等所有已安装 App

**第二层：社交渠道快捷按钮（补充）**
- 在系统分享按钮下方，添加一排具名渠道图标：Pinterest / X / Facebook / WhatsApp / Copy Link
- 点击后通过各平台的 Web Intent URL 直接跳转
- Pinterest 可带 `media` 参数传图片 URL（需要先将海报上传到公开 Storage）
- 桌面端（无 `navigator.share`）这排按钮成为主要分享方式

**海报公开 URL 支持**：
- 将生成的海报图片上传到 Supabase Storage 公开 bucket，获取公开 URL
- Pinterest / Facebook / X 的分享需要可公开访问的图片 URL（data URL 不行）
- 同时生成一个带 OG meta 的落地页 URL，提升各平台卡片预览效果

### 改动清单

| 文件 | 改动 |
|------|------|
| `src/components/ShareSheet.tsx` | 重构：移动端大"Share"按钮 + 社交渠道快捷行（Pinterest/X/Facebook/WhatsApp/Copy Link），桌面端隐藏系统分享按钮 |
| `src/hooks/useSharePoster.ts` | 新增 `uploadPosterToStorage` 方法，将海报 blob 上传到公开 bucket `shared-posters`，返回公开 URL |
| 数据库迁移 | 创建 `shared-posters` 公开 Storage bucket |
| `src/components/ShareSheet.tsx` | 接收 `publicImageUrl` prop，用于 Pinterest/X/Facebook 的 media 参数 |

### 用户体验流程

```text
用户点击 "Share" 按钮
        │
        ├─ 移动端 ──→ 弹出 ShareSheet Drawer
        │              ├─ 大按钮 "Share to..." → navigator.share() 系统面板
        │              │   └─ 包含 iMessage / Instagram / WhatsApp / Snapchat 等
        │              └─ 快捷行: [Pinterest] [X] [WhatsApp] [Copy Link] [Save]
        │
        └─ 桌面端 ──→ 弹出 ShareSheet Drawer
                       └─ 快捷行: [Pinterest] [X] [Facebook] [WhatsApp] [Copy Link] [Save]
```

