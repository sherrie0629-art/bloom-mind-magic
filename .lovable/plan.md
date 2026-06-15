# 修复"已设为 English 却仍收到中文回复"

## 诊断

代码看下来语言链路本身是对的：
- `useLocale` 从 `i18n.resolvedLanguage` 取值；Settings 改语言会同时写 `localStorage` 和 `profiles.locale`。
- `Chat.tsx` 把 `locale` 传给 `streamChat`，再到 `supabase/functions/chat`，那里有一条很强的"English Lock"系统消息。

但截图里 Luna 仍然蹦出大段中文，说明实际链路至少有一处没按预期工作。最可能的两类原因：

1. **客户端 locale 实际就是 `zh`**：profile 里存的是旧值 `zh`，登录后 `LocaleSync` 把 i18n 改回 `zh`，覆盖了用户在 Settings 切到 English 的状态；或当前用户根本没在该浏览器执行过 Settings 切换（profile=`zh` 仍占主导）。
2. **模型偶发漂移**：即使 prompt 锁英文，Gemini 在某些情境（例如 mystic 神秘语气、长上下文）仍可能输出中文，目前没有后置校验。

## 解决方案（双重保险）

### A. 客户端：确保发送给后端的 `locale` 是用户真正选择的值
1. `Chat.tsx` 发送前从 `localStorage["app.locale"]` 直接读一次作为兜底，与 `useLocale` 取较新者。
2. Settings 切换语言后立刻调用一次 `i18n.reloadResources` 并强制把新值写回 `profiles.locale`，避免 `LocaleSync` 在下次登录回灌旧值（已经会写，但加 `await` + toast 后再渲染）。
3. 加一行 `console.debug("[chat] sending locale", locale)`，方便后续复现确认。

### B. 后端：加一个"语言守门员"作为最后一道防线
在 `supabase/functions/chat/index.ts` 流式结束 / 非流式返回时：
- 统计回复中**中文字符占比**与**英文字母占比**。
- 当 `locale==="en"` 且中文占比 > 8%（或包含连续 ≥ 4 个汉字的句段），自动发起**一次轻量重写调用**（同模型，system 只放最严格的 English-only 指令 + 原回复），把结果替换后再 flush 给前端。
- 反向同理：`locale==="zh"` 且英文单词占比 > 40% 时触发重写。
- 仅触发 1 次，避免死循环；失败时回落到原回复（不阻断聊天）。

由于聊天是流式的，重写做法：先把流式 token 缓冲到本地字符串，stream 结束前做检测——若需要重写，把已经发出的 token "覆盖"成纠正后的版本（前端通过一条 `event: replace` 或简单地清空再写新内容。最低成本：改为先收完再一次性下发；或保留流式但末尾追加 `\n\n[corrected]\n<rewritten>` 并由前端只显示后者）。
> **简化决策**：先把流式 buffer 在服务端聚合，完成后再统一 `enqueue` 给前端。这条路径只在检测到语言不符时触发完整重写，正常情况仍走原流式。

### C. mystic 角色专项加固
在 `agentBasePrompts.mystic` 顶部追加一句：
> "Always speak in the user's app language. If the language lock says English, never mix Chinese into mystical phrases — translate them."

避免 Luna 因角色风格倾向写中文神秘短语。

## 文件改动
- `src/pages/Chat.tsx`：locale 取值兜底 + debug log。
- `src/hooks/useLocale.ts`：Settings 切换后顺手清掉 stale profile 写法（保持现有逻辑，加 `await`）。
- `supabase/functions/chat/index.ts`：新增 `enforceReplyLanguage()` 后置校验 + 必要时一次性重写；mystic basePrompt 微调。

## 验收
1. 在 Settings 切到 English，刷新后看 console 输出 `[chat] sending locale en`。
2. 给 mystic 发 `You read me like a book`，回复 100% 英文。
3. 切回中文，回复 100% 中文。
4. 反复 5 次不复现混语。

确认后切到 build 模式落地。
