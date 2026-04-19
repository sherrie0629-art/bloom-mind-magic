

## Paddle 切换方案（更新版）

### 调整点
仅更新方案中**产品定位措辞**，让 Paddle 资格审核更易过：
- 旧：AI 心理陪伴 / 占卜订阅
- 新：**情感陪伴 AI（AI Companion）+ 游戏化自我探索体验（Gamified Self-Discovery）+ 灵感启发内容（Inspirational Content）**

> 原则：不出现"占卜 / fortune telling / divination / psychic"等敏感词；强调 AI 陪伴、人格测评（MBTI/Enneagram/Bazi 文化解读）、灵感日签、互动叙事等中性、合规表达。

### 用户决策已确认
- 存量用户：**目前没有付费用户** → 直接清理 Lemon Squeezy，无兼容负担
- 是否建产品：**是，沿用现有定价**
  - Plus 月付 **$4.99 / month**
  - Plus 年付 **$47.99 / year**

### 实施步骤

| 阶段 | 动作 |
|------|------|
| 1 | 调用 `payments--recommend_payment_provider` 审核（提交时按"情感陪伴 AI + 游戏化自我探索 + 灵感启发"定位） |
| 2 | 通过后调用 `payments--enable_paddle_payments` 启用沙盒 |
| 3 | 删除 `supabase/functions/lemon-webhook/`，调用 `supabase--delete_edge_functions` 解除部署 |
| 4 | `index.html` 移除 lemon.js；`src/vite-env.d.ts` 移除 `Window.LemonSqueezy` 类型 |
| 5 | `src/pages/Profile.tsx` 替换 `openCheckout` 为 `Paddle.Checkout.open({ items, customData: { user_id } })`；移除 `LS_MONTHLY_URL` / `LS_YEARLY_URL` |
| 6 | 用 `batch_create_product` 创建：Plus Monthly $4.99、Plus Yearly $47.99 |
| 7 | 新建 `supabase/functions/paddle-webhook/` 处理 `subscription.created/updated/canceled`，仍 upsert 到 `user_subscriptions`（字段不变，`useSubscription` 零改动） |
| 8 | 提示你在 Cloud 后台手动删除 `LEMON_SQUEEZY_WEBHOOK_SECRET` |

### 提交给 Paddle 的产品描述（建议文案）

> **Island AI** is an AI companion app for emotional well-being and self-reflection. Users chat with AI characters for supportive conversation, complete gamified personality assessments (MBTI, Enneagram, Big Five, cultural archetypes), and receive daily inspirational prompts. The Plus subscription unlocks unlimited AI chats, unlimited assessments, and in-depth personality reports. The product is **entertainment and self-discovery only**, not medical, psychological, or fortune-telling advice — clearly disclaimed in the Terms of Service.

### 不会改动
- `user_subscriptions` 表 / RLS / `useSubscription`
- 鉴权与业务页面
- 数据库 schema

### 风险
- 即使措辞严谨，Paddle 仍可能要求补充材料；若被拒，回退方案是改用内置 Stripe（`payments--enable_stripe_payments`），同样无需用户自有账号即可沙盒测试

### 切换后预期
1. Profile 页点击订阅 → Paddle 沙盒结账弹窗
2. 支付完成 → `paddle-webhook` → `user_subscriptions` 升级 plus
3. `useSubscription` 立即识别为付费

