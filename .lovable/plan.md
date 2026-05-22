## 结论

这次不是之前判断的 token 截断问题。最新日志显示 chat 后端的 `finish_reason` 是 `stop`，说明模型是“正常结束”了，但它有时仍只输出：

```text
【⚡Energy+2】
【🎭Mood:starry】
```

前端解析掉这些游戏标记后，正文为空，于是触发“她好像走神了，再发一次试试”。

## 根因判断

当前问题更像是 prompt 指令冲突导致的模型行为不稳定：

- 系统提示里多次强调“可跳过 follow-up question / Silence is preferred / DEFAULT = no question”。
- 虽然也写了“必须有正文”，但模型偶发把“可以沉默”误用于整条回复正文。
- `finish_reason: stop` 证明它不是没来得及输出，而是认为“只输出 Mood / Energy 标记”也是合规完成。
- 这会影响 Zoe、Chloe 等所有共用 `RPG_INSTRUCTION` 的角色，不是单个角色问题。

## 修复方案

### 1. 收紧后端系统提示

修改 `supabase/functions/chat/index.ts`：

- 删除或改写容易被误解的 `Silence is better` / `DEFAULT = no question` 类表述。
- 保留“follow-up question 可省略”，但明确：
  - 可省略的只有问题；
  - 正文永远不可省略；
  - 输出 marker 之前必须至少有一段角色口吻回应。
- 在 prompt 末尾再加一条硬规则：如果你准备只输出 markers，必须先写一句自然回应。

### 2. 后端增加二次修复兜底

仍在 `supabase/functions/chat/index.ts` 内实现服务端安全网：

- 流式响应先在后端聚合完整 AI 输出。
- 用与前端一致的 marker 清理逻辑判断正文是否为空。
- 如果正文为空但 marker 存在，后端自动发起一次非流式“repair”请求，让同一角色基于最近用户消息补一段 1-2 句正文，并保留原 marker。
- 前端拿到的最终流仍是正常 SSE，所以 UI 不需要大改。

这样即使模型偶发走神，用户也不会看到空泡或重试 toast。

### 3. 增强诊断日志

在后端记录：

- 原始输出正文长度；
- 是否触发 marker-only 修复；
- 修复是否成功；
- `finish_reason`。

后续再出现问题时，可以直接区分是：模型空正文、网关异常、流式解析异常，还是前端解析异常。

### 4. 前端保留最后防线

`src/pages/Chat.tsx` 里的空正文 toast 逻辑保留，作为后端修复失败时的最后保护；不扩大 UI 改动范围。

## 验证方式

- 在 Zoe (`/chat?agent=bestie`) 连续发送多轮短句和中文闲聊，确认不再出现“她好像走神了”。
- 在 Chloe (`/chat?agent=barista`) 重复同样场景，确认正文稳定存在。
- 查看后端日志，如果模型再输出 marker-only，应看到 repair 日志，而不是用户侧失败。

## 风险与回滚

- 服务端聚合后再转发会让真正显示首字的时间略微变晚，但回复整体更稳定。
- 如果 repair 请求失败，仍回退到现有前端 toast，不会破坏聊天状态。
- 若后续确认某个模型完全稳定，可再恢复纯流式直传。