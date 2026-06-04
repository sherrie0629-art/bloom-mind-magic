## 问题

在缘分配对页面填完表单点「确认」时：
- 未登录会被跳转到 `/auth`，所有已填的信息（双方昵称、MBTI、星座、特质、关系阶段、近况）都丢了。
- 登录回来后表单是空的，体验差。

## 方案

1. **本地持久化表单**：在 `CompatibilityFlow.tsx` 用 `localStorage` 保存草稿（key 如 `compat-draft`），字段包括 `myName / myMbti / myZodiac / myTraits / partnerName / partnerMbti / partnerZodiac / partnerTraits / stage / vibe`。
   - 任一字段变化时 debounce 写入。
   - 组件挂载时若 `step === "input"` 且本地有草稿则恢复。
   - 成功生成结果后清空草稿。

2. **登录后回到原页面**：跳 `/auth` 时带上 `redirect=/assessment/compatibility`，登录成功后路由回来；草稿自动从 localStorage 恢复，用户无需重填。
   - 若 `/auth` 已支持 `redirect` 参数（先确认），直接复用；否则在 `/auth` 登录成功后读取 `searchParams.get("redirect")` 跳转。

3. **更友好的未登录提示**：把弹窗文案改成「请先登录后再开启缘分配对，已填信息会为你保留」，避免「你没有登录」的硬感。

## 技术细节

- 草稿读写包成小 hook `useCompatibilityDraft()`，内部 `useEffect` 监听字段数组写入 localStorage（JSON.stringify），初始读时一次性 `setState`。
- 跳转写法：`navigate("/auth?redirect=" + encodeURIComponent("/assessment/compatibility"))`。
- 不动数据库、不动 RLS、不动业务逻辑，纯前端持久化 + 跳转参数。

## 影响范围

- `src/pages/CompatibilityFlow.tsx`：加草稿持久化、改跳转、改提示文案。
- `src/pages/Auth.tsx`（或登录页对应文件）：登录成功后若有 `redirect` 参数则跳回。
- i18n：新增/修改一条「请先登录」的中英文文案。

旧用户已填但因跳走丢失的内容无法找回；此后再发生即可自动保留。