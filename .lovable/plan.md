
## 更新后的实施方案

这次我会在“重写每日塔罗核心版”的基础上，按你的新要求同步调整两件事：

1. 全应用固定文案统一改成英文  
2. 保留“保存海报”能力，不删除

## 方案调整

### 1. 每日塔罗继续按“全新核心版”重写
- 下线旧的 `DailyWhisper` 逻辑，重建为干净的每日塔罗核心流程
- 新结构仍采用：
  - 新页面：`DailyTarot`
  - 新数据表：`tarot_draws`
  - 新后端函数：`tarot-draw` + `tarot-draw-status`
- 保留旧入口 `/daily-whisper`，但内部实现切到新的塔罗页面，避免入口失效

### 2. 保存海报功能明确保留
- 不删除现有海报能力
- 每日塔罗结果页会保留“Save Poster / Save to Device”这类导出入口
- 实现上优先复用现有共享能力：
  - `src/hooks/useSharePoster.ts`
  - `src/components/PosterPreviewDialog.tsx`
- 只会把相关文案统一成英文，并适配新的塔罗结果内容

### 3. 全应用界面文案统一改成英文
我会做一次“固定文案清理”，把目前残留的中文 UI 文案统一成英文，重点包括：
- 登录/注册页
- 首页 CTA 和提示文案
- 每日塔罗页面
- 各测评页按钮、提示、加载态、错误提示
- 弹窗、toast、空状态、历史记录标题、解锁提示
- 海报预览和保存相关按钮/提示

目标是去掉当前中英混用，统一成完整英文体验。

### 4. 每日塔罗的用户可见输出也改成英文
因为之前方案里我准备统一成中文，现在按你的新要求改为：
- 塔罗页面标题、按钮、状态文案改英文
- AI 解读输出改英文
- Action tip 改英文
- 海报里的标题、说明、底部品牌文案改英文
- 卡牌状态统一为英文，例如 `Upright / Reversed`

### 5. 不再沿用旧的 Whisper 语义
这次会一起清掉旧命名残留：
- 页面语义用 Tarot
- 后端函数语义用 Tarot
- 数据表语义用 Tarot
- 存储继续使用 `tarot-card-art`
- 不再保留 Whisper 时代的命名逻辑和混杂状态分支

## 预期结果

重写后会得到一套更简单、更稳定的每日塔罗核心功能：

```text
Open Daily Tarot
→ Draw today’s card
→ Get English reading
→ Poll for generated card art
→ Display final result
→ Save poster successfully
```

同时整个应用里的固定界面文案会统一为英文，不再出现中文界面字符串混入。

## 技术实施范围

### 需要重写/新增
- `src/pages/DailyTarot.tsx`（或直接替换现有 `DailyWhisper.tsx` 实现）
- `supabase/functions/tarot-draw/index.ts`
- `supabase/functions/tarot-draw-status/index.ts`
- 新 migration：`tarot_draws` 表 + RLS

### 需要同步清理/调整
- `src/App.tsx`
- `src/pages/Index.tsx`
- `src/pages/Auth.tsx`
- `src/components/PosterPreviewDialog.tsx`
- `src/hooks/useSharePoster.ts`
- 其他含中文固定文案的页面（如登录提示、toast、测评页按钮等）

## 额外注意事项

- “保存海报”会保留；如果“分享”不是必须，本次可以不作为核心交付重点
- 现有 `useSharePoster` / `PosterPreviewDialog` 是多处页面复用的，我会保留它们，只改文案和接入方式，不会粗暴删除
- 当前项目记忆里有“必须中文”的旧规则，这次实现时需要同步更新为新的英文界面规则，避免后续又被改回去

## 验收重点

我会按这些点落地与验证：
1. 未登录时进入每日塔罗，英文提示正确
2. 登录后首次抽牌成功
3. 英文解读正常返回
4. 图片生成中状态正常，不再卡死
5. 图片完成后自动显示
6. Save Poster 可正常使用
7. 390 宽移动端下按钮、文案、海报预览不溢出
8. 首页、登录页、塔罗页等固定界面文案统一为英文
