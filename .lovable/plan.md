# 修复九型人格报告结果页两个问题

## 根因

**1. 标题 "Type undefined"**
后端 `assessment-enneagram` 返回的字段是 `type`（数字 1–9），但前端 `AssessmentReports.tsx` 与 `AssessmentDetail.tsx` 读取的是不存在的 `d.enneagramType`，所以渲染成 `Type undefined · 标题`。

**2. 图片只显示占位符 "AI generated…"**
`useSharePoster.fetchAIImage()` 内部用 `loadImageViaBlobUrl` 把后端返回的稳定 URL（Supabase Storage 公开链接 / data URI）转成了浏览器临时 `blob:` URL。四个测评流程（Enneagram / MBTI / Zodiac / Emotion）都直接把这个 `blob:` URL 写进了 `assessment_results.result_data.imageUrl`。
数据库里实际保存的就是 `"imageUrl": "blob:https://…/19d344e3-…"`——这种 URL **只在生成它的那个页面会话内有效**，刷新或换页面后立即失效，所以报告详情页加载时图片永远 404，只剩占位文案。
（已在网络请求里直接看到 DB 中存了 `blob:` 开头的 imageUrl，验证了根因。）

## 修复方案（仅前端）

### 步骤 1：标题字段兼容
- `src/pages/AssessmentReports.tsx` `getTitle` 中 enneagram 分支：`Type ${d.enneagramType}` → `Type ${d.type ?? d.enneagramType ?? "?"}`
- `src/pages/AssessmentDetail.tsx` `getTitle` 中 enneagram 分支：同样改为 `d.type ?? d.enneagramType ?? "?"`

### 步骤 2：持久化稳定 URL（不是 blob）
在 `fetchAIImage` 已经支持 `returnUrlOnly: true`，直接返回后端给的稳定 URL，无需 blob 包装。把四个流程改为先用 `returnUrlOnly: true` 取到稳定 URL，用它同时作为 `<img>` 显示源 **和** 写入 DB 的 `imageUrl`。

涉及文件：
- `src/pages/EnneagramFlow.tsx` `fetchResultImage`
- `src/pages/AssessmentFlow.tsx`（MBTI）对应图片获取逻辑
- `src/pages/ZodiacFlow.tsx` 对应图片获取逻辑
- `src/pages/EmotionFlow.tsx` 对应图片获取逻辑

每处改成：
```ts
const img = await fetchAIImage(prompt, { cacheKey, returnUrlOnly: true });
if (img?.src) {
  setResultImageUrl(img.src);          // 稳定 URL，刷新后仍可用
  // 同样的 img.src 写入 result_data.imageUrl
}
```
`ResultAIImage` 直接 `<img src={…}>` 渲染，本来就不需要 blob，CORS 也不会受影响。

### 步骤 3：兼容已写脏的旧数据
在 `AssessmentDetail.tsx` 渲染 `d.imageUrl` 之前加一个判断：若以 `blob:` 开头就不渲染（避免破图），等用户重新生成会写入正确 URL。
（不做 DB 清理，老数据自然失效；新数据从此正确。）

## 其他测评页排查结果

| 测评 | 标题字段 | 后端实际字段 | 状态 |
|---|---|---|---|
| MBTI | `d.mbtiType` | `mbtiType` ✅ | OK |
| Enneagram | `d.enneagramType` | `type` ❌ | 本次修复 |
| Zodiac | `d.zodiacSign` | `zodiacSign` ✅ | OK |
| Emotion | `d.emoji + d.title` | 同 ✅ | OK |

图片 blob 持久化问题：**MBTI / Zodiac / Emotion 都有一样的 bug**，本次一并按步骤 2 修复。

## 不做的事
- 不动数据库 schema，不动 edge function。
- 不做后台清理脚本（旧 blob 数据让前端静默不渲染即可）。
