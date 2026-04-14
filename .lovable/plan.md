

## 方案：简化付费策略 — Free vs Plus

将 "premium" 重命名为 "plus"，移除单次付费逻辑，新增 Deep Report 每日限额，简化权益展示。

---

### 最终付费体系

| 功能 | Free | Plus ($4.99/月 · $47.99/年) |
|------|------|---------------------------|
| Daily Chats | 20 | Unlimited |
| Daily Quizzes | 5 | Unlimited |
| Deep Reports | ❌ | 1/天 |

---

### 修改清单（7 步）

#### 1. 数据库迁移
- `usage_tracking` 新增 `deep_report_count` 列 (integer, default 0)
- `user_subscriptions` 新增 `billing_period` 列 (text, default 'monthly')

#### 2. `src/hooks/useSubscription.ts`
- LIMITS 改为 `free: { chat: 20, assessment: 5, deepReport: 0 }` / `plus: { chat: 9999, assessment: 9999, deepReport: 1 }`
- plan 类型从 `"premium"` 改为 `"plus"`
- 新增 `deepReportCount`、`deepReportLimit`、`canDeepReport` 状态
- 新增 `incrementDeepReport` 方法
- load 时并行查询 `deep_report_count`

#### 3. `src/pages/Profile.tsx`
- "Premium" → "Plus" 全局替换
- `premiumBenefits` 简化为 3 行（Chats / Quizzes / Deep Reports），移除 "AI Memory" 和 "Chemistry"
- 移除 `PurchaseRecord` 接口、`PRODUCT_LABELS`、`purchases` state 及 Purchase History 区块
- 菜单移除 Chemistry 独立入口
- 升级按钮增加月/年切换：`$4.99/mo` | `$47.99/yr (save 20%)`
- 订阅卡新增 Deep Reports 进度条

#### 4. `src/pages/AssessmentDetail.tsx`
- 按钮文案从 `"Unlock Deep Report ($4.99)"` 改为 `"Upgrade to Plus to unlock"`
- `plan === "premium"` → `plan === "plus"`
- 已是 Plus 用户时显示 "Generate (1/day)" 并调用 `canDeepReport` 判断
- 移除 `needPayment` / `$4.99` 相关 toast，改为引导升级

#### 5. `supabase/functions/generate-deep-report/index.ts`
- `isPremium` 改为 `isPlus`，检查 `plan === "plus"`
- 移除 `purchase_records` 查询逻辑（第 76-91 行）
- 非 Plus 用户直接返回 402 + `needUpgrade: true`
- Plus 用户新增当日 `deep_report_count` 检查（从 `usage_tracking` 查询），超限返回 429
- 生成成功后自增 `deep_report_count`

#### 6. `src/pages/Admin.tsx`
- "Premium" → "Plus" 文案替换（dashboard 统计标签、用户列表徽章）
- `setPremium` → `setPlus`，写入 `plan: "plus"`
- 保留 purchases tab（历史记录仍可查看）

#### 7. 各测评页面清理
- `Chat.tsx`：`plan === "premium"` → `plan === "plus"` 在错误提示中
- `BaziFlow.tsx`：中文错误提示改为英文，`plan === "premium"` → `plan === "plus"`
- `EnneagramFlow.tsx` / `AssessmentFlow.tsx` / `CompatibilityFlow.tsx` / `ZodiacFlow.tsx` / `EmotionFlow.tsx`：同上替换

