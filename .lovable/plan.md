

## 方案：Free 用户 30 天免费试用期

注册超过 30 天的 Free 用户将无法继续使用，需升级为 Plus。

### 实现逻辑

利用 `user.created_at`（Auth 自带字段）计算注册天数，无需新增数据库字段。

- **注册 ≤ 30 天**：正常使用 Free 额度（20 聊天 / 5 测验）
- **注册 > 30 天且未升级**：`canChat = false`、`canAssess = false`，引导升级

### 修改文件（3 个）

#### 1. `src/hooks/useSubscription.ts`
- 新增 `freeTrialExpired: boolean` 和 `freeTrialDaysLeft: number` 状态
- `load` 函数中根据 `user.created_at` 计算是否过期
- Free 用户过期后 `canChat` / `canAssess` 返回 `false`

#### 2. `src/pages/Profile.tsx`
- Free 用户订阅卡中显示"免费试用剩余 X 天"
- 试用过期后显示红色提示"免费试用已结束，请升级 Plus"

#### 3. `src/pages/Chat.tsx`
- 试用过期时拦截发送，弹出升级提示

### 传参调整

`useSubscription` 需要接收 `createdAt` 参数（从 `user.created_at` 获取），用于计算试用天数。

