

## 法务页面合规改造（Paddle 上线审核）

卖家：**Qian Wang (trading as Island AI)**
当前 `TermsOfService.tsx` 和 `PrivacyPolicy.tsx` 已存在，但缺少 Paddle 必需的若干条款。退款政策已是合规版本，保留不动。

### 改动清单

| 文件 | 改动 |
|------|------|
| `src/pages/TermsOfService.tsx` | 在第 1 节加入卖家身份（Qian Wang trading as Island AI）；新增"AI 产品专属条款"小节（Paddle 对生成式 AI 强制要求）；保留现有第 6 节退款政策 |
| `src/pages/PrivacyPolicy.tsx` | 加入 data controller 身份；新增 Paddle 作为 MoR 的数据共享条款；补全 GDPR 用户权利与国际数据传输声明；明确数据保留期 |

### Terms 关键新增内容

**第 1 节 Introduction 增补**：
> "Island AI is operated by **Qian Wang (trading as Island AI)** ('we', 'our', 'the Service'). By using the Service you are entering into an agreement with Qian Wang."

**新增第 7 节 — AI Content & Acceptable Use**（Paddle 对生成式 AI 强制项）：
- 用户对自己的 prompts 和如何使用输出负责
- 必须对输入内容拥有合法权利
- AI 输出可能不准确、不完整，不可作为医疗/法律/金融/心理专业建议
- 我们保留过滤输出、移除内容、暂停违规账号的权利
- IP 侵权投诉路径：发邮件到 `islandai_life@outlook.com`，重复侵权账号将被终止
- 禁止用途细化：deepfakes、仇恨言论、恶意软件、jailbreak、未成年人色情、impersonation

**第 8 节 IP Ownership** 强化：
- 明确服务、软件、agent 角色、品牌资产归 Qian Wang (trading as Island AI) 所有
- 用户保留对自己输入内容的所有权，授予我们有限托管/处理许可

后续章节序号顺延。

### Privacy 关键新增内容

**第 1 节 Introduction 增补**：
> "Island AI ('we', 'our', 'the Service') is operated by **Qian Wang (trading as Island AI)**, who acts as the **data controller** for personal data processed through the Service."

**第 3 节 How We Use Your Data** 增补每类数据的法律依据：
- Account info → contract performance
- Conversation/assessment data → contract performance
- Technical logs → legitimate interest（安全与防滥用）
- Marketing（如有）→ consent

**新增独立小节 — Sharing With Paddle (Merchant of Record)**：
> "We share order and billing-related data (name, email, billing country, transaction details) with **Paddle.com Market Limited**, our Merchant of Record. Paddle processes payments, calculates and remits sales tax, issues invoices, and handles refund requests on our behalf. Paddle acts as an independent data controller for this purpose. See Paddle's privacy policy at https://www.paddle.com/legal/privacy."

**新增小节 — Other Recipients**：
- Hosting/backend infrastructure (Lovable Cloud)
- AI inference providers (用于生成回复)
- Authorities where legally required

**新增小节 — Data Retention**：
- Account data：账号存续期间 + 删除请求后 30 天清理
- Conversation data：删除账号时一并清理
- Logs：90 天

**第 6 节 Your Rights 改写为 GDPR 完整版**：
- access / rectification / erasure / restriction / portability / objection / withdraw consent
- 1 个月响应期
- 有权向主管监管机构投诉

**新增小节 — International Transfers**：
> "Personal data may be processed outside the UK/EEA by our service providers. Where this happens, we rely on Standard Contractual Clauses or adequacy decisions to safeguard your data."

**更新 LAST_UPDATED 日期**为今天。

### 不会改动
- Terms 第 6 节退款政策（已是合规版本）
- 数据库 / RLS / 订阅逻辑 / Paddle 接入
- Privacy 第 4/5 节（Storage/Cookies 措辞已合规）

### 后续建议
更新完成后可运行 `payments--get_go_live_status` 让 Paddle 重新扫描站点，进入 verification 阶段。

