

## 方案：存储桶重命名 `whisper-images` → `tarot-card-art`

### 改动清单

#### 1. 数据库迁移
- 创建新桶 `tarot-card-art`（私有）
- 添加 RLS 策略（SELECT/INSERT 限制用户自身文件夹，service_role 全权限）
- 删除旧桶 `whisper-images`（当前实际不存在，但清理旧策略）

#### 2. Edge Function `supabase/functions/daily-whisper/index.ts`
- 第 34 行、第 124 行：`"whisper-images"` → `"tarot-card-art"`

#### 3. 前端 `src/pages/DailyWhisper.tsx`
- 第 51 行：`"whisper-images"` → `"tarot-card-art"`

共涉及 1 个迁移 + 2 个文件改动，逻辑不变，仅重命名。

