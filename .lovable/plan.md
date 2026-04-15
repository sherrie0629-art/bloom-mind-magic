

## 修复方案：塔罗牌图片生成失败

### 问题根因

Edge Function 日志显示：
```
Upload error: { statusCode: "404", error: "Bucket not found", message: "Bucket not found" }
```

`whisper-images` 存储桶从未创建，图片生成成功但无处上传，`image_url` 永远为 `null`。

### 修复清单

#### 1. 数据库迁移 — 创建 `whisper-images` 存储桶
- 创建名为 `whisper-images` 的**私有**存储桶
- 添加 RLS 策略：
  - `SELECT`：用户只能读取自己文件夹下的文件（`(storage.foldername(name))[1] = auth.uid()::text`）
  - `INSERT`：用户只能上传到自己文件夹（同上路径约束）

#### 2. 前端 `DailyWhisper.tsx` — 改善轮询体验
- 轮询超过 20 次（约 40 秒）后，将 "Generating card art..." 文案改为 "Card art unavailable"，不再无限等待
- 添加轮询失败的视觉反馈（如显示默认占位图 + 提示文字）

### 技术要点
- Edge Function (`daily-whisper`) 的 `generateAndSaveImage` 函数逻辑无需修改，上传路径 `${userId}/${timestamp}.png` 已正确
- 只需确保存储桶存在 + RLS 策略匹配即可

