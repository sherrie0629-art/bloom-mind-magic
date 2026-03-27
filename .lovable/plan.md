

## 检查结果：豆包 API 残留代码清理

### 当前状态
版本回退后，所有 edge function **实际运行时**确实走的是 Lovable AI 路径（因为 `app_settings` 默认值是 `"lovable"`），但 **10 个文件中仍保留着豆包的分支代码和降级逻辑**。`generate-poster-image` 已经是纯 Lovable AI，无需修改。

### 需要清理的文件

| 文件 | 残留内容 |
|------|----------|
| `supabase/functions/chat/index.ts` | `getAIConfig` 中的豆包分支 + `getLovableFallback` |
| `supabase/functions/assessment/index.ts` | 同上 |
| `supabase/functions/assessment-bazi/index.ts` | 同上 |
| `supabase/functions/assessment-compatibility/index.ts` | 同上 |
| `supabase/functions/assessment-emotion/index.ts` | 同上 |
| `supabase/functions/assessment-zodiac/index.ts` | 同上 |
| `supabase/functions/daily-whisper/index.ts` | 同上 + 注释提到 doubao |
| `supabase/functions/generate-deep-report/index.ts` | 同上 |
| `supabase/functions/generate-soul-fragment/index.ts` | 同上 |
| `supabase/functions/summarize-conversation/index.ts` | 同上 |
| `src/pages/Admin.tsx` | 豆包切换卡片 UI + 切换逻辑 |

### 改动方案

#### 1. 简化所有 Edge Function 的 AI 调用
将每个函数中的 `getAIConfig` / `getLovableFallback` / `fetchAI` 三件套替换为直接调用 Lovable AI Gateway：

```typescript
// 替换前：~30行的 getAIConfig + getLovableFallback + fetchAI
// 替换后：直接构建请求
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: "google/gemini-3-flash-preview", ...requestBody }),
});
```

- `chat/index.ts` 保留已有的 429/500 降级逻辑（用备用模型重试），但移除豆包相关代码
- 其他 9 个函数直接调用，无需降级

#### 2. 清理 Admin.tsx
- 移除豆包切换卡片 UI
- 移除 `switchProvider` 中的豆包相关逻辑
- 保留 Lovable AI 卡片作为唯一选项（或完全移除 AI 切换区域）

#### 3. 重新部署所有 Edge Function
清理后统一部署全部 10 个函数。

### 不需要修改的文件
- `generate-poster-image/index.ts` — 已是纯 Lovable AI
- 数据库 `app_settings` 表 — 保持原样即可，`ai_provider` 字段不再被读取

