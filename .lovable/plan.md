## 更新退款政策为"零消耗 30 天退款"

### 背景与合规检查

当前 `TermsOfService.tsx` 第 6 节是旧版"概不退款 + 7 天善意窗口"措辞，**会被 Paddle 上线审核拒绝**。新文案改为"14天 + 零消耗条件"既符合 Paddle 要求（14–90 天窗口、引导 paddle.net），又能防止 AI 资源被白嫖。

> Paddle 政策原文允许 seller 自定义退款条款，只要不出现 "all sales final / no refunds" 这类绝对化措辞。"零消耗才退"属于合理资格条件，可以接受。

### 改动清单


| 文件                             | 改动                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| `src/pages/TermsOfService.tsx` | 重写第 6 节 "Refund Policy"，套用用户给的文案 + Paddle MoR 引导                                    |
| Pricing 页                      | **当前项目没有独立 Pricing 页**（订阅入口在 `/profile`），改为更新 `src/pages/Profile.tsx` 订阅卡片下方的退款说明小字 |


### Terms of Service 第 6 节新内容

> **6. Refund Policy**
>
> We offer a **14-day money-back guarantee for accounts with zero consumption**. If you have not utilized any AI features or consumed any tokens (e.g., AI chats, personality reports, tarot insights, or deep reports) after your purchase, you may request a full refund within 14 days of your initial order date.
>
> Once any AI services have been generated or tokens have been consumed, the order becomes **non-refundable** due to the immediate resource costs incurred (compute, third-party AI inference, and storage).
>
> Refunds are processed by our payment provider, **Paddle**, who is the Merchant of Record. To request a refund, visit **paddle.net** or contact us at [islandai_life@outlook.com](mailto:islandai_life@outlook.com).
>
> Renewal payments follow the same rule: a renewal is refundable only if no paid features have been used in the new billing period. We do not provide pro-rated refunds for cancellations made mid-period — you keep access until the end of the paid period.

### Profile 页改动

在订阅 CTA 下方加一行 12px 灰字：

> "14-day refund available if no AI features have been used. See [Terms](/terms) for details."

### 不会改动

- Privacy Policy / 其他 Terms 章节
- 数据库 / RLS / 订阅逻辑 / Paddle 接入

### 备注

更新后建议尽快推进 Paddle live 上线流程（`payments--get_go_live_status`），让审核扫描到合规文案。