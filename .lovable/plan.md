# 让 4 位 AI 角色的 TTS 更像"在和你聊天"

## 问题诊断

当前 `supabase/functions/tts-speak/index.ts` 里 `voice_settings` 普遍偏"播报":
- `stability` 偏高 (0.55–0.7)：声音平稳但**情绪起伏被压平**，听上去像在念稿。
- `style` 偏低-中 (0.3–0.55)：性格特征/语气表现力不足。
- 中文 voice 直接读纯文字，**没有停顿/口语化标记**（如 "嗯…"、逗号断句），ElevenLabs 在长句上更容易出现"主持人腔"。
- 文本清洗 (`cleanForSpeech`) 把 `*动作*`、`【...】`、`...` 这类自然的口语停顿全部抹掉，反而失去节奏。
- 中文统一走 `eleven_v3` → 失败回落 `multilingual_v2`，没有针对"对话"做模型选择。

## 优化方案（只动 TTS 层，不改前端 UI / 业务逻辑）

### 1. 重新调每个角色的 voice_settings（核心）
按"角色性格 + 自然对话"重做参数表：

| Agent  | stability | style | speed | 风格目标 |
|--------|-----------|-------|-------|---------|
| barista (Chloe) | 0.35 | 0.55 | 0.98 | 温柔咖啡师，轻声细语带笑意 |
| jax    | 0.45 | 0.60 | 0.97 | 退伍消防员，低沉松弛、带停顿 |
| mystic (Luna)   | 0.40 | 0.70 | 0.92 | 神秘但像在耳边低语，不庄严 |
| bestie (Zoe)    | 0.20 | 0.85 | 1.10 | 闺蜜炸毛感，语调跳脱 |

中英两套都同步降 stability、升 style；`use_speaker_boost` 在 bestie / barista 关掉（speaker_boost 会让声音更"播音")。

### 2. 引入"对话化文本预处理" `humanizeForSpeech(text, agentId)`
在 `cleanForSpeech` 之后插一层：
- 保留并把 `*笑*` `*叹气*` 这类动作转成 ElevenLabs 支持的 audio tag（如 `[laughs]` `[sighs]` `[whispers]`），v3/multilingual_v2 都能识别口语 tag。
- 中文长句按"，。！？"自动在末尾追加自然停顿（`…`/`,`），避免一口气念完。
- 句末感叹号/问号保留并放大 → 触发模型情绪曲线。
- bestie 角色追加少量口语化感叹词（"哎呀"开头时保留），mystic 在首句注入 `[whispers]` 前缀（仅当文本 < 60 字时）。

### 3. 模型选择改成"对话优先"
- 中文：默认 `eleven_v3`（最自然），失败回落 `eleven_multilingual_v2`（保留现有逻辑）。
- 英文：从 `eleven_multilingual_v2` 切到 `eleven_turbo_v2_5` 作为"对话"模型——它的低延迟 + 对 tag 的响应更口语化；保留 v2 作为 fallback。

### 4. 句子级 request stitching（可选，仅 >120 字时启用）
长回复一次合成会变播报腔。当文本超过 ~120 字时按句切 2–3 段，使用 `previous_text` / `next_text` 拼接，保持自然韵律但每段更短促。
> 如果觉得复杂，可以只做 1–3 步，本步骤先在代码里留 TODO，不在本次启用。

## 不改动的部分
- 前端 `TTSContext`、`MessageVoiceButton`、Settings 的速度/音量控件不动。
- 不替换 voiceId（避免音色突变让用户错愕），只在参数 + 文本预处理上做"自然化"。
- 不动鉴权 / 缓存 / fallback 错误处理结构。

## 技术细节（仅供参考）

文件改动：仅 `supabase/functions/tts-speak/index.ts`
- 修改 `VOICE_MAP` 数值（第 14–35 行）。
- `callElevenLabs` 增加可选 `useSpeakerBoost` 参数。
- 新增 `humanizeForSpeech(text, agentId, lang)`，在 `cleanForSpeech` 之后调用。
- `pickModel` 新增英文分支返回 `eleven_turbo_v2_5`，并扩展 fallback 触发条件。

## 验收
- 重新生成同一条回复的语音，听感对比：
  - barista 听起来像"小声分享"而非"广播节目主持"
  - jax 有自然停顿、不像新闻播报
  - mystic 像"贴耳低语"而非"诗朗诵"
  - bestie 起伏明显、语速更跳

确认后我切换到 build 模式实施。
