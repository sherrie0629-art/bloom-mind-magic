

## 修复"管理订阅"在 COOP 环境下无法打开

### 根本原因

Lovable 预览（以及部署后的站点）运行在设置了 `Cross-Origin-Opener-Policy` 响应头的环境中。当代码用 `window.open("about:blank", "_blank")` 打开空白标签后，再把它导航到 Paddle 的跨域 URL 时，浏览器的 COOP 策略直接拦截了这次跨域导航。

`window.open` + 异步填 URL 的模式在 COOP 环境下行不通。

### 修复方案

**放弃新标签页，改为当前标签页直接跳转。** 用户在 Paddle 客户中心操作完后，用浏览器返回键回到 Profile 页。

只改 `src/pages/Profile.tsx` 中 `handleManageSubscription`：

```ts
const handleManageSubscription = useCallback(async () => {
  if (!user) return;
  setPortalLoading(true);
  try {
    const { data, error } = await supabase.functions.invoke("paddle-customer-portal");
    if (error) throw error;
    if (!data?.url) throw new Error("No portal URL returned");
    // 当前标签直接跳转，避免 COOP 拦截
    window.location.href = data.url;
  } catch (e: any) {
    console.error(e);
    toast.error(e?.message || "无法打开管理页面，请稍后重试");
  } finally {
    setPortalLoading(false);
  }
}, [user]);
```

### 不会改动
- Edge function（已正常返回 URL）
- 数据库 / RLS / 订阅逻辑

### 验证
点击 Manage Subscription → 当前页面跳转到 Paddle 客户中心 → 操作完后浏览器返回键回到 Profile。

