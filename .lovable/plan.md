

## Lemon Squeezy Overlay 支付集成方案

### 背景
用户选择 Lemon Squeezy 作为 MOR（名义商户），需要手动集成。当前 `user_subscriptions` 表已存在，`useSubscription` hook 已实现订阅状态读取。

### 实施步骤

#### 1. 在 `index.html` 添加 Lemon Squeezy 脚本
在 `<head>` 中加入 `<script src="https://assets.lemonsqueezy.com/lemon.js" defer></script>`，启用 Overlay 弹出层结账。

#### 2. 创建 Webhook Edge Function
新建 `supabase/functions/lemon-webhook/index.ts`：
- 接收 Lemon Squeezy 的 `order_created` / `subscription_created` / `subscription_updated` / `subscription_expired` 等事件
- 用 HMAC 签名验证请求合法性
- 从 webhook payload 中提取用户邮箱，匹配 `auth.users`，更新 `user_subscriptions` 表的 `plan`、`billing_period`、`expires_at`
- 需要一个 `LEMON_SQUEEZY_WEBHOOK_SECRET` 密钥

#### 3. 修改 Profile 页面的"Upgrade to Plus"按钮
- 点击时调用 `window.createLemonSqueezy()` 初始化
- 使用 `window.LemonSqueezy.Url.Open()` 打开你的结账链接
- 结账链接中通过 `?checkout[custom][user_id]=xxx&checkout[email]=xxx` 传递用户信息，方便 webhook 关联
- 月付/年付按钮分别对应不同的 Lemon Squeezy 结账链接

#### 4. 处理支付成功后的 UI 状态
- 监听 `window` 上的 Lemon Squeezy 事件（`Checkout.Success`）
- 成功后调用 `useSubscription` 的 `refresh()` 重新拉取订阅状态
- 显示 toast 提示"Upgrade successful!"
- UI 自动切换为 Plus 状态（进度条、图标、权益展示）

#### 5. 添加 TypeScript 类型声明
在 `src/vite-env.d.ts` 中扩展 `Window` 接口，声明 `createLemonSqueezy` 和 `LemonSqueezy` 类型。

### 你需要提供的信息
- **Lemon Squeezy 结账链接**：月付和年付各一个（格式如 `https://xxx.lemonsqueezy.com/checkout/buy/xxx`）
- **Webhook 签名密钥**：在 Lemon Squeezy 后台创建 webhook 时生成的 signing secret

### 涉及文件
- `index.html` — 添加 JS 脚本
- `src/vite-env.d.ts` — TS 类型声明
- `src/pages/Profile.tsx` — 按钮逻辑 + 成功回调
- `supabase/functions/lemon-webhook/index.ts` — 新建 webhook 处理函数
- `user_subscriptions` 表无需改动，现有结构已够用

### 不涉及的
- 不使用 Lovable 内置支付集成（Paddle/Stripe）
- 不需要新建数据库表
- 不需要 Lemon Squeezy SDK，仅用其 JS overlay 脚本

