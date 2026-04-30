
## 调整退款政策措辞：从 "zero consumption" 改为允许 "minimal usage"

### 背景
上一轮已经把 Terms 第 6 节改成"无条件 14 天退款"。Paddle 审核反馈认为太严格的"零消耗"会与 14 天保护精神冲突；现在你希望明确写成"轻度使用也可退款"，给一个具体阈值（少于 5 条聊天 或 1 次基础测评）作为示例，同时保留对滥用行为的拦截权。

### 改动内容

**1. `src/pages/TermsOfService.tsx` — 第 6 节"Refund Policy"**
重写为以下结构（要点）：
- 明确 **14-day money-back guarantee**，不再写"zero consumption"或"non-refundable once consumed"。
- 增加"minimal usage"友好条款示例：*"Even if you have lightly tried the service — for example, sent fewer than 5 chat messages or completed up to 1 basic assessment — you remain eligible for a full refund within the 14-day window."*
- 退款由 Paddle（Merchant of Record）处理，引导到 paddle.net 或 support 邮箱。
- 保留"abuse 例外"条款（重复退款套利、批量榨取 AI 输出后退款等可拒绝），但措辞放在"minimal usage 友好"之后，避免被理解为默认拒绝。
- 续订与按周期保留访问的说明保持原样。

**2. `src/pages/Pricing.tsx` — 卡片底部小字**
当前是 `14-day money-back guarantee · Cancel anytime`，与新政策一致，**无需修改**。

### 不会改动
- Pricing 页面布局、价格、Paddle 集成
- 其他页面（Profile 升级卡保持现有 14 天文案）
- 数据库、Edge functions

### 验证
打开 `/terms` → 第 6 节读起来：14 天无条件退款 + 轻度使用仍可退（含 5 条聊天/1 次基础测评示例）+ 通过 paddle.net 退 + 滥用情形可拒绝。然后用户可重新跑 Paddle readiness check。
