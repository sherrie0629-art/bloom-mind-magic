## 调整目标

1. **Zoe 声线更阳光高昂**：当前参数 `stability=0.35, style=0.65, speed=1.05`，听感偏八卦闺蜜但情绪饱满度不够。
2. **中文 TTS 不生硬**：当前 4 个角色全部用英文母语音色（Sarah / Matilda / Brian / Jessica）念中文，音色本身能说中文但腔调像"外国人说中文"，这是生硬感的根本原因。

---

## 一、Zoe 情绪调整

**新参数（在 `supabase/functions/tts-speak/index.ts` 的 `VOICE_MAP.bestie`）**：


| 项目               | 旧    | 新        | 作用                             |
| ---------------- | ---- | -------- | ------------------------------ |
| stability        | 0.35 | **0.28** | 更不稳定 → 起伏更大、更有"哇~""真的假的！"那种跳跃感 |
| style            | 0.65 | **0.80** | 风格化拉满，更夸张、更戏剧化                 |
| speed            | 1.05 | **1.08** | 略微提速，像兴奋时的语速                   |
| similarity_boost | 0.8  | 0.75     | 略放开，让情绪表演空间更大                  |


同时在 `cleanForSpeech` 之外，对 Zoe 单独保留 `！？~` 等情绪标点（目前 markdown 清洗不会动这些，已 OK），并在 prompt 入口考虑保留 `哈哈` `天呐` 这类口头语。

---

## 二、中文生硬问题：三档方案

### 方案 A（推荐，零额外成本）：按语言切换音色

检测文本是否以中文为主（`/[\u4e00-\u9fa5]/` 占比 > 30%）。如果是中文，切换到 ElevenLabs 中文母语 / 中文友好音色：


| 角色          | 英文音色（保留）                       | 中文音色（新增）                                            |
| ----------- | ------------------------------ | --------------------------------------------------- |
| Chloe（暖咖啡师） | Jessica `cgSgspJ2msm6clMCkdW9` | **Xiaoxiao 风** — `4VZIsMPtgggwNg7OXbPY`（温柔女声，中文自然）  |
| Jax（沉稳消防员）  | Brian `nPczCjzI2devNBz1zQrb`   | **Martin** — `XA2bIQ92TabjGbpO2xRr`（成熟男声中文）         |
| Luna（神秘缪斯）  | Matilda `XrExE9yKIg1WjnnlVkGX` | **Stacy** — `B8gJV1IhpuegLxdpXFOE`（空灵女声中文）          |
| Zoe（闺蜜）     | Sarah `EXAVITQu4vr4xnSDxMaL`   | **Monika Sogam** — `aMSt68OGf4xUZAnLpTU8`（活泼年轻女声中文） |


> 上述中文音色 ID 是 ElevenLabs 中文社区常用的公开 voice，实现时第一步会先用 `GET /v1/voices` 验证当前账号是否可访问；若某个不可用，回落到英文音色并打日志。

**结构变更**：`VOICE_MAP` 改成

```ts
{ bestie: { en: {...}, zh: {...} }, ... }
```

Edge Function 中 `pickVoice(agentId, text)` 返回对应语言配置。

### 方案 B（质量更好，需小投入）：模型升级到 `eleven_turbo_v2_5` 或 `eleven_v3`

- `eleven_v3` 对中文韵律和情绪表达比 `multilingual_v2` 明显自然，但价格更高、延迟略升。
- 可与方案 A 叠加：中文走 v3，英文继续走 multilingual_v2 控成本。

### 方案 C（终极方案，工程量大）：自己克隆/调一个中文音色

- 用 ElevenLabs Voice Lab 上传 1–2 分钟中文样本，做 Instant Voice Clone，每个角色一个克隆音色。
- 效果最像"角色本人在说中文"，但需要素材、需要付费档位，先不做。

---

## 三、本次实现范围（建议先做）

1. ✅ Zoe 情绪参数调整（方案对应行）
2. ✅ 方案 A：中文/英文音色按语言自动切换
3. ✅ 方案 B 的一半：把 `model_id` 改为可配置，中文请求自动用 `eleven_v3`（如账号未开通则回落 `multilingual_v2`）
4. ⏸ 方案 C 暂缓，等你听完 A+B 的效果再决定

**文件改动**（仅 1 个文件）：

- `supabase/functions/tts-speak/index.ts`
  - `VOICE_MAP` 改为 `{ [agentId]: { zh: VoiceConfig, en: VoiceConfig } }`
  - 新增 `detectLang(text)` 与 `pickVoice(agentId, text)`
  - 新增 `pickModel(lang)`：中文 → `eleven_v3`，英文 → `eleven_multilingual_v2`
  - 调整 Zoe 参数
  - 同一文本 + 语言 切换会让前端缓存 key 自动失效（缓存 key 已包含 text，无需改）

前端、UI、i18n、Settings 不动。

---

## 待你确认

1. **Zoe 新参数方向**是否 OK：更跳脱、更夸张？还是希望"阳光但稳一点"（那 stability 反而该提到 0.5）？//ok
2. **中文音色**是否同意走方案 A + B（自动切换 + 中文用 v3 模型）？若你已有偏好的中文 voiceId，可直接给我替换。//ok
3. 是否要顺便给 **Sage / Luna** 也微调情绪？（目前没反馈，默认不动）