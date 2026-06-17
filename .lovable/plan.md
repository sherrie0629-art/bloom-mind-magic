## 目标
彻底移除项目中所有 Paddle 付费 / 订阅相关代码，使 Lovable 允许 remix。保留功能本身（聊天、测评、深度报告、Soul Mirror 等），统一按"免费 / 全开放"逻辑运行。

## 方案概览
不动数据库结构（保留 `user_subscriptions`、`usage_tracking` 表，避免破坏现有数据），只在前端/边缘函数层做"无支付化"改造：
1. 删除 Paddle 相关文件
2. 把 `useSubscription` 改成永远返回 `plan: "plus"`、用量限制设为 `Infinity`、`freeTrialExpired: false`
3. 移除 `/pricing` 路由和所有跳转
4. 清理 Profile 页里的订阅 / 客户门户 UI

## 具体改动

### 1. 删除文件
- `src/hooks/usePaddleCheckout.ts`
- `src/lib/paddle.ts`
- `src/pages/Pricing.tsx`
- `supabase/functions/get-paddle-price/`
- `supabase/functions/paddle-customer-portal/`
- `supabase/functions/payments-webhook/`
- `supabase/functions/_shared/paddle.ts`

### 2. `src/hooks/useSubscription.ts`
简化为：始终返回
```
plan: "plus",
chatLimit / assessmentLimit / deepReportLimit: Number.POSITIVE_INFINITY,
freeTrialExpired: false,
freeTrialDaysLeft: 9999,
```
保留 `chatCount / assessmentCount / deepReportCount` 的真实读取（如果其他 UI 还在用），其余字段照常返回。这样所有 `if (plan === "plus")` / `if (!freeTrialExpired)` 等判断自动放行，无需改调用方。

### 3. `src/App.tsx`
- 移除 `const Pricing = lazyWithReload(...)`
- 移除 `<Route path="/pricing" .../>`

### 4. `src/pages/Profile.tsx`
- 移除 `usePaddleCheckout` 导入与使用
- 移除 Paddle 结账成功检测、`paddle-customer-portal` 调用
- 删除"升级 / 管理订阅"按钮区块，保留个人资料其他部分

### 5. `src/components/DeepReportUnlock.tsx`
- 把 `navigate("/pricing")` 改为：直接调用解锁逻辑（因为现在全部用户都是 plus），或者隐藏 Unlock 入口、默认展示报告。最小改动：把跳转替换成 `toast` 提示"已默认开放"，或直接 `return null` 让组件不再渲染。

### 6. 边缘函数侧
- `supabase/functions/chat/index.ts`、`assessment*`、`generate-deep-report/index.ts` 等里如果有 Paddle/订阅校验逻辑，去掉该校验（让所有请求按 plus 处理）。仅删除/短路 if 分支，不改业务主体。

### 7. i18n
- 删除 `zh.json` / `en.json` 中 `pricing.*`、`subscription.*`、`paddle.*` 相关键（可选，不影响运行，仅为干净）。

### 8. 类型文件
- `src/integrations/supabase/types.ts` 是自动生成的，不手动改。保留 `user_subscriptions` 表类型即可。

## 验证
- 构建通过、无 `usePaddleCheckout`/`paddle` 残留引用：`rg -i "paddle" src` 应为空
- 访问 `/pricing` 应自然 404 跳到首页
- 聊天、测评、Soul Mirror、深度报告均可无限使用
- 之后即可在 Lovable 上 remix

## 备注
执行完后，你也可以在 Lovable 项目设置里确认 Paddle 集成已断开（你之前已经断开过）。如希望以后再加回付费，重新接入 Lovable 内建 Payments 即可。