

## 修复"管理订阅"打开空白标签页

### 根本原因
`window.open("about:blank", "_blank", "noopener,noreferrer")` 中的 **`noopener`** 让 `window.open` 按规范返回 `null`，导致：
- 浏览器开了一个空白标签（用户看到的空白页）
- 我们的代码以为弹窗被拦截，走 fallback `window.location.href = data.url` → **当前标签跳到 Paddle**（用户切回来发现"空白"，其实是 Paddle 正在跨域加载）

`noopener` + 拿到 window 引用本身就是矛盾的，必须二选一。这里我们需要引用来填 URL。

### 改动
仅一处，`src/pages/Profile.tsx` 第 77 行：

```ts
// Before
const popup = window.open("about:blank", "_blank", "noopener,noreferrer");

// After
const popup = window.open("about:blank", "_blank");
```

去掉 `noopener,noreferrer` 后：
- `window.open` 正常返回 popup 引用
- `popup.location.href = data.url` 把空白标签跳转到 Paddle 客户中心
- 当前标签保持在 Profile 页

安全性：Paddle 是受信任域名，且我们跳转后不再操作 popup 引用，无 reverse tabnabbing 风险。

### 不会改动
- Edge function（已正常返回 URL）
- 数据库 / RLS / 订阅逻辑
- 其他 Profile 页面逻辑

### 验证方式
点击 Manage Subscription → 应当：
- 新标签页直接打开 Paddle 客户中心（不再空白）
- 当前 Profile 页保持原状（不再跳走）

