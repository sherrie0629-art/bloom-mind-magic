

## Google 登录 `provider 'google' is not supported` 排查与修复方案

### 现象与日志分析

- 用户报错文案：`provider 'google' is not supported`
- 从代码日志看：
  - 后端 `auth_logs` 没有任何 Google OAuth 相关条目
  - `function_edge_logs` 也没有 Google OAuth 相关条目
  - 只看到邮箱密码登录成功
- 前端代码已经规范使用：
  ```ts
  lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })
  ```
- 该报错文案是 **Lovable Cloud Auth Broker（即 `oauth.lovable.app` / `/~oauth/initiate` 代理层）** 在校验 provider 时返回的，**不是 Supabase Auth 的报错**，所以 Supabase 的 `auth_logs` 自然查不到

### 根本原因判断

报错 `provider 'google' is not supported` 通常意味着：**Lovable Cloud 后台的 Authentication → Sign-In Methods 里 Google 这个登录方式没有被启用**。

虽然代码已经接好，并且 Lovable Cloud 默认提供 Google 托管 OAuth 的能力，但能力是否对你这个项目"开着"，是平台层的开关，需要在 Cloud 后台显式启用。这是个无法仅靠代码修复的问题。

### 修复方案

#### 第一步（必须，由用户执行）：在 Lovable Cloud 后台启用 Google 登录

1. 进入 **Cloud → Users → Auth Settings → Sign-In Methods**
2. 找到 **Google** 这个 Provider
3. 把它的开关 **打开**
4. 保持"使用平台默认托管"的选项即可（不需要自己填 Client ID/Secret）
5. 保存

> 我会在回复中提供一个 `<lov-open-backend>` 按钮，方便你直接进入后台。

#### 第二步（可选，代码侧增强容错）：提升错误反馈

目前点击按钮后如果 broker 回 `provider not supported`，前端只是 toast 一句"Google sign-in failed"，不够清晰。计划做：

- 在 `src/pages/Auth.tsx` 和 `src/components/AuthPromptDialog.tsx` 中：
  - 拿 `result.error` 的真实 message（而不是统一一句话），显示给用户
  - 当 message 含 `not supported` 这类关键字时，提示更友好的话术：
    - "Google 登录暂未启用，请稍后再试或使用邮箱登录"

这样后续如果再遇到 broker 层报错，可以直接从前端 toast 看出问题，不必再翻日志。

### 改动清单

| 文件 | 改动 |
|------|------|
| 后台（无文件） | 启用 Google sign-in method |
| `src/pages/Auth.tsx` | Google 登录失败时透传真实错误信息，并对 `not supported` 做友好提示 |
| `src/components/AuthPromptDialog.tsx` | 同上同步处理 |

### 不会改动

- `src/integrations/lovable/index.ts`（平台生成）
- `src/contexts/AuthContext.tsx`（OAuth 回调消费逻辑已正确，无需再动）
- 邮箱密码登录链路
- 数据库与 RLS

### 修复后的预期结果

1. 在后台启用 Google 后
2. 点击"Sign in with Google"
3. 浏览器跳转到 Google 完成授权
4. 回到 islandai.life
5. `AuthContext` 自动消费回调，登录态建立
6. 不再出现 `provider 'google' is not supported`

