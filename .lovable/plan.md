

## 方案：匿名模式 + Google One Tap 一键登录

### 核心思路

用户进入应用后无需注册即可体验核心功能（浏览首页、聊天、做测验）。当触发需要持久化数据的操作时（如保存聊天记录、查看历史、解锁 Deep Report），弹出登录提示，支持 Google One Tap 一键完成。

```text
用户进入 → 匿名浏览/聊天（本地缓存） → 触发存储操作 → 弹出登录弹窗
                                                          ↓
                                              Google One Tap / 邮箱登录
                                                          ↓
                                              本地数据迁移至云端
```

### 匿名模式规则

| 功能 | 匿名可用 | 触发登录 |
|------|----------|----------|
| 浏览首页 | ✅ | — |
| 聊天（前 5 条） | ✅ 本地存储 | 第 6 条消息 |
| 做测验 | ✅ 显示结果 | 保存报告 |
| Daily Whisper | ❌ | 进入时 |
| 查看历史 | ❌ | 进入时 |
| Profile | ❌ | 进入时 |
| Deep Report | ❌ | 点击时 |

### 修改清单（6 步）

#### 1. 创建登录弹窗组件 `src/components/AuthPromptDialog.tsx`
- 全局可复用的模态弹窗，包含 Google One Tap 按钮 + 邮箱登录表单
- 接收 `open` / `onClose` / `reason`（提示文案，如"登录后保存聊天记录"）
- Google 登录使用 `lovable.auth.signInWithOAuth("google")`
- 邮箱登录保留现有逻辑

#### 2. 配置 Google OAuth（工具调用）
- 使用 Configure Social Auth 工具生成 `src/integrations/lovable/` 模块
- Lovable Cloud 自动管理 Google OAuth 凭据，无需额外配置

#### 3. 修改 `src/contexts/AuthContext.tsx`
- 新增 `isAnonymous: boolean`（`user === null` 时为匿名）
- 新增 `promptLogin: (reason: string) => void` 方法，控制弹窗显示
- 新增 `loginPromptState: { open: boolean; reason: string }` 状态
- 在 Provider 最外层渲染 `<AuthPromptDialog />`

#### 4. 修改 `src/pages/Chat.tsx` — 匿名可聊天
- 移除 `if (!user) return` 的硬拦截
- 匿名用户消息存 `useState`（不写数据库），跳过 conversation/memory 加载
- 匿名用户发第 6 条消息时调用 `promptLogin("登录后保存聊天记录")`
- 登录成功后将本地消息写入数据库（创建 conversation + chat_messages）

#### 5. 修改路由守卫页面 — 需登录页面拦截
- `DailyWhisper.tsx` / `ConversationHistory.tsx` / `Profile.tsx` / `Vault.tsx` / `SoulMap.tsx`：
  - 页面顶部检查 `!user`，调用 `promptLogin` 并导航回首页
- `AssessmentDetail.tsx`：保存报告时检查登录状态
- 各测评 Flow 页面：允许答题，提交结果时检查登录

#### 6. 修改 `src/pages/Auth.tsx` — 增加 Google 登录
- 表单上方添加 "Continue with Google" 按钮
- 调用 `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
- 保留邮箱登录作为备选

### 技术要点

- **不使用 Supabase 匿名登录**：纯前端状态管理，避免产生大量匿名用户记录
- **数据迁移**：登录成功后 `onAuthStateChange` 触发时，检查本地缓存并批量写入
- **本地缓存键**：`mindgarden_anon_chat_{agentId}` 存 JSON 消息数组
- **30 天试用期**：仅在用户注册后开始计算，匿名模式不受影响

