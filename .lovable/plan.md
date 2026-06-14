## 问题诊断
截图里 AI 用"Hey there! 👋"开头回复，但 locale 已是中文。检查发现：

1. `supabase/functions/chat/index.ts` 第 405–412 行已经在系统提示里加了"必须用中文回复"的最高优先级指令，但 Gemini 在用户输入仅为 `hi` 这类英文短句时，仍会"镜像"地用英文打招呼词（Hey/Hi/OK）开头。当前指令只禁止"整句英文"，未明确禁止英文打招呼词，所以模型钻了空子。
2. 其它语言相关位置巡检结果：
   - `assessment` / `assessment-emotion` / `assessment-enneagram` / `assessment-zodiac` / `generate-deep-report` / `generate-soul-fragment` / `extract-memory-incremental` / `tarot-draw`：都正确按 `locale` 注入 `langInstr`，**无问题**。
   - `recall-memory` / `chat-tarot-draw` / `summarize-conversation` / `tts-speak`：不直接生成给用户读的文案（或只做检索/图像），**无问题**。
   - 前端 `getAgentWelcome`（`src/lib/localizeAgent.ts`）走 i18n key，回退文案是英文。当 i18n key 命中时（已有 zh），用中文 welcome，**正常**；只有未配 zh welcome 的 agent 才会回退英文（目前 4 个核心 agent 都已有 zh welcome，**无问题**）。

结论：只有 `chat` edge function 的语言指令需要加固。

## 修复方案
### `supabase/functions/chat/index.ts`（仅改 `langHeader` 与 `langFooter`，约第 407–412 行）

把 `isZh === true` 分支的语言指令升级为：

1. **绝对语言锁定**：无论用户用什么语言写消息（包括 `hi` / `hello` / `thanks` / `ok` / `lol` 这类英文短语或单词），整条回复（包括第一个词、第一个语气词、emoji 旁边的语气词）必须是简体中文。
2. **显式禁止常见英文打招呼词**：`Hey / Hi / Hello / Yo / OK / Okay / Thanks / Sure / Welcome / Hey there` 等不可作为开头或穿插使用，需替换为中文对应词（"嘿 / 嗨 / 你好 / 好呀 / 谢谢 / 当然 / 欢迎"）。
3. **保留例外**：英文人名（Adam、Daniel、Luna、Chloe、Jax、Zoe）、必要专有名词（MBTI、INFJ、12 星座英文缩写）、固定标记 `【🔮 Hidden Memory Unlocked】` 仍可保留。
4. `langFooter` 同步加一行"再次确认：回复第一个字符必须是中文（汉字、中文标点或 emoji），不得是英文字母"。

### 不改动
- agent 的 basePrompt 与 lore（已由 langHeader 覆盖翻译义务）。
- 其它 edge function（已正确处理 locale）。
- 前端 i18n 文案与 welcome 渲染逻辑（无 bug）。

## 验证
- 中文 locale 下发送 `hi`，AI 回复首字应为中文（如"嗨"或"你好"），不再出现 "Hey there!"。
- 英文 locale 下行为保持不变（仍英文回复）。