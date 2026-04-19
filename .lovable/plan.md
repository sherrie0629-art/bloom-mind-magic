

## 修复"管理订阅"点击无反应（弹窗被浏览器拦截）

### 根本原因
`handleManageSubscription` 是 async：先 `await supabase.functions.invoke(...)`（耗时 1–3s），再 `window.open(url)`。Chrome/Safari 在异步等待之后调用 `window.open` 时**已经脱离了用户手势上下文**，会静默拦截。所以表现为"按钮闪一下，什么都没发生"，控制台和 edge logs 都正常。

证据：
- Edge function 最近 4 次调用全是 200，已成功返回 `urls.general.overview`
- 没有 toast 报错（说明 `data.url` 存在）
- Session replay 显示按钮 loading 后恢复，无新窗口

### 修复方案
**点击瞬间先 `window.open('about:blank', '_blank')` 占位拿到 window 引用**（此时还在用户手势内，不会被拦截），异步拿到真正的 URL 后再 `popup.location.href = url` 跳转。这是处理"异步拿 URL 再开新窗口"的标准模式。

### 改动
仅修改 `src/pages/Profile.tsx` 中 `handleManageSubscription`：

```ts
const handleManageSubscription = useCallback(async () => {
  if (!user) return;
  // 1. 同步打开占位窗口（用户手势内，不会被拦截）
  const popup = window.open("about:blank", "_blank", "noopener,noreferrer");
  setPortalLoading(true);
  try {
    const { data, error } = await supabase.functions.invoke("paddle-customer-portal");
    if (error) throw error;
    if (!data?.url) throw new Error("No portal URL returned");
    if (popup) {
      popup.location.href = data.url;        // 跳转占位窗口
    } else {
      // 兜底：用户禁用了 popup，原地跳转
      window.location.href = data.url;
    }
  } catch (e: any) {
    popup?.close();                           // 失败时关掉空白页
    console.error(e);
    toast.error(e?.message || "无法打开管理页面，请稍后重试");
  } finally {
    setPortalLoading(false);
  }
}, [user]);
```

### 不会改动
- Edge function（已正常工作）
- 数据库 / RLS / 订阅逻辑

### 备注
修复后建议再次点 Manage Subscription 验证 Paddle 客户中心能正常打开。如果用户浏览器完全禁止了弹窗，会自动 fallback 到当前标签跳转。

