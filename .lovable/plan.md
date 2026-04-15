
## 诊断结论

图片其实已经生成成功，问题不在生成，而在“显示链路”。

从当前请求可以确认：
- `daily-whisper` 的 `check-image` 已经返回了 `tarot-card-art` 的 signed URL
- `daily_tarot_draws.image_url` 也已经成功写入文件路径
- 但前端随后又发起了 `whisper-images/...` 的签名请求，并返回 404

也就是说：后端已经把图生成并上传好了，但前端某个运行中的逻辑还在用旧桶名 `whisper-images` 去取图，所以界面才一直停在 “Generating card art”。

## 修复方案

### 1. 统一图片 URL 生成来源
修改 `supabase/functions/daily-whisper/index.ts`

- 保留现有 `action: "check-image"` 轮询逻辑
- 新增一个用于获取历史记录/已签名图片的 action（例如 `action: "history"`）
- 由后端统一读取 `daily_tarot_draws`，并把 `image_url` 全部转换成可直接渲染的 signed URL 后返回

目的：以后图片桶名只在后端维护一处，前端不再自己签名，彻底避免再次出现 `whisper-images` / `tarot-card-art` 不一致。

### 2. 去掉前端本地签名逻辑
修改 `src/pages/DailyWhisper.tsx`

- 删除 `resolveImageUrl()` 里直接调用 `supabase.storage.from(...).createSignedUrl()` 的逻辑
- `loadHistory()` 改为调用 edge function 的新 action，直接拿已经签好的图片 URL
- 轮询成功后直接更新 `result.imageUrl`
- 刷新历史列表时也使用后端返回的已签名 URL，不再由浏览器自行拼/签 storage 地址

### 3. 修正图片状态管理
继续调整 `src/pages/DailyWhisper.tsx`

- 新抽牌前重置 `imageTimedOut`
- 轮询成功后重置 `imageTimedOut`
- 点击历史记录切换卡片时也重置该状态
- 成功拿到图片后立即停止轮询，避免重复请求
- 图片真实加载失败时显示 fallback，但不再触发旧桶请求

### 4. 做一次桶名一致性清理
检查并统一以下位置只使用 `tarot-card-art`

- `src/pages/DailyWhisper.tsx`
- `supabase/functions/daily-whisper/index.ts`

如有必要，会把桶名提取成单一常量，避免后续再次出现旧命名残留。

## 预期结果

修复后流程会变成：

```text
抽牌 → AI 解读返回 → 后端异步生成图片 → 轮询拿到 signed URL → 页面直接显示图片
```

不会再出现：
```text
图片已生成成功，但前端又去请求 whisper-images 导致 404
```

## 技术说明

- 这次不需要新增数据库表，也不需要再改存储桶权限
- 当前桶 `tarot-card-art` 已存在，上传链路也已经是通的
- 真正需要修的是：前端显示层还残留了旧桶取图逻辑
- 由于“仓库源码已是 `tarot-card-art`，但运行时网络仍请求 `whisper-images`”，实现后还需要触发一次完整预览重载，确保旧 bundle 缓存被清掉

## 涉及文件

- `src/pages/DailyWhisper.tsx`
- `supabase/functions/daily-whisper/index.ts`
