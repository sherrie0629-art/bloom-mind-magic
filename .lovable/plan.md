
## 添加 Pricing 计费页面（14 天退款）

### 改动内容

**1. 新建 `src/pages/Pricing.tsx`**
- 复用 `DesktopLayout` + `SEO`，与现有页面风格一致
- 顶部标题 "Choose Your Plan" + 副标题
- 月/年切换 toggle（年付标 "Save 20%"）
- 两张卡片网格（桌面 2 列居中，移动 1 列）：
  - **Free**：$0，列出 20 chats/day、5 quizzes/day、基础功能；按钮 "Current Plan"（已登录免费用户）/"Get Started"（未登录跳 `/auth`）
  - **Plus**（推荐，高亮边框 + Crown 图标 + "Most Popular" 角标）：$4.99/mo 或 $47.99/yr，列出 Unlimited chats、Unlimited quizzes、1 Deep Report/day、所有 agents 解锁；按钮 "Upgrade to Plus"，调用 `usePaddleCheckout`
- 已是 Plus 用户访问时，Plus 卡按钮显示 "Manage Subscription"，点击走 `paddle-customer-portal`
- 未登录点 Upgrade → 跳 `/auth`
- 卡片底部一行小字（居中、muted）：**"针对无付费使用记录的账号提供 14 天退款保障"**
- 集成 `SEO`：`title="Pricing — Island AI"`

**2. `src/App.tsx`**
- 引入 `Pricing` 并加路由 `<Route path="/pricing" element={<Pricing />} />`

**3. `src/components/SiteFooter.tsx`**
- 在导航链接中加一项 `Pricing`（位于 Contact 前）

### 不会改动
- 数据库、Edge functions、Paddle 产品/价格（沿用现有 `plus_monthly` / `plus_yearly`）
- Profile 页升级卡（保留作为快捷入口）
- 品牌色与现有设计 token

### 验证
访问 `/pricing` → 看到两栏（Free / Plus + 月年切换）→ 点 "Upgrade to Plus" 弹出 Paddle 结账 → 底部显示 14 天退款小字。
