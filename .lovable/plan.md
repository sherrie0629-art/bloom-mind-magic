

## 全局 Footer + 三个法务页面

### 思路调整
按用户要求改为**全局 Footer**（不只是首页），所以放在 `App.tsx` 的路由外层，所有页面共享。

### 改动清单

| 文件 | 改动 |
|------|------|
| `src/components/SiteFooter.tsx` | 新建。三个链接 + 版权，浅灰色小字号 |
| `src/pages/Contact.tsx` | 新建。联系邮箱 `islandai_life@outlook.com` + mailto |
| `src/pages/PrivacyPolicy.tsx` | 新建。重点说明 Google 账号信息收集 + 对话数据保护 |
| `src/pages/TermsOfService.tsx` | 新建。重点写订阅续费、取消、退款政策 |
| `src/App.tsx` | 注册 `/contact`、`/privacy`、`/terms` 路由；在 `<Routes>` 之后渲染 `<SiteFooter />` |

### Footer 设计
- 位置：`App.tsx` 路由之后，作为全局组件
- 样式：`text-xs text-muted-foreground/70`，分隔符 `·`
- 移动端：避开 `BottomNav`，加 `pb-20 md:pb-4`
- 在 `/auth` 页面也展示，符合"全站通用"

### 内容要点

**Privacy Policy**（英文）：
- Google OAuth 收集：email, name, avatar URL（仅用于账号识别，不读取 Gmail/Drive）
- 对话数据：加密存储于 Lovable Cloud (Supabase)，不用于训练第三方模型
- 用户权利：随时删除账号 / 导出数据 / 联系邮箱
- Cookie / 本地存储说明

**Terms of Service**（英文）：
- 服务说明 + AI 输出免责（非医疗/心理咨询替代）
- **Subscription**：自动续订规则、计费周期、如何在 Profile 页取消
- **Refund Policy**：明确写"As a digital subscription service, all purchases are final and non-refundable except where required by law"，并说明 7 天内未使用可申请退款的窗口（如适用）
- 知识产权 / 终止 / 变更条款

**Contact**：`islandai_life@outlook.com` + 简短说明 + mailto 按钮

### 不改动
- 数据库 / RLS / 鉴权
- BottomNav / 现有页面布局

