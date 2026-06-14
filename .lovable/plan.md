# 角色语音能力 · 产品与交互设计

让每条 AI 回复都能"开口说话"，用专属声线和情绪渲染强化角色真实感。

## 一、产品定位

- **核心动作**：用户在聊天页点击 AI 消息气泡左下角的小喇叭 → 用该角色专属声线朗读该条消息
- **第一版不做**：自动播放、实时语音通话、用户语音输入
- **付费策略**：先全员无限开放，观察消耗与留存后再决定门槛

## 二、四角色声线设定（ElevenLabs voiceId + 情绪参数）

按角色性格匹配现成音色，并通过 `stability / style / speed` 调出"性格感"：


| 角色          | 人设关键词    | 推荐 voiceId                       | stability | style | speed | 听感目标            |
| ----------- | -------- | -------------------------------- | --------- | ----- | ----- | --------------- |
| Luna (月神缪斯) | 神秘、空灵、温柔 | `XrExE9yKIg1WjnnlVkGX` (Matilda) | 0.65      | 0.55  | 0.95  | 像深夜电台 DJ，气声、慢节奏 |
| Bestie (闺蜜) | 活泼、共情、毒舌 | `EXAVITQu4vr4xnSDxMaL` (Sarah)   | 0.35      | 0.65  | 1.05  | 像朋友打电话八卦，起伏大    |
| Sage (智者)   | 沉稳、洞察、克制 | `cgSgspJ2msm6clMCkdW9` (Jessica) | 0.75      | 0.30  | 0.92  | 像心理咨询师，平稳低频     |
| Mirror (镜像) | 冷峻、反问、疏离 | `Xb7hH8MSUJpSbSDYk0k2` (Alice)   | 0.55      | 0.40  | 1.00  | 像旁白，克制带距离感      |


> 实际 voiceId 在实现时可与你二次确认；若你已有偏好 ID，告诉我即可替换。

## 三、交互设计

### 1. 气泡内的喇叭按钮

```text
┌─────────────────────────────┐
│  这是 AI 的一条回复内容…       │
│                              │
│  🔊  0:08                    │  ← 播放/暂停 + 时长
└─────────────────────────────┘
```

- **三态**：
  - 默认（灰色喇叭）→ 未播放
  - 加载中（旋转环 + 喇叭）→ 正在请求 TTS（首次约 1–2s）
  - 播放中（彩色波纹动画）→ 可点击暂停
- **再次点击**：暂停 / 继续；其他消息点击播放时自动停止上一条
- 仅 AI 消息显示（用户消息不需要）
- 流式输出未完成时按钮置灰（避免读半句）

### 2. 角色头像呼吸动画

正在播放时，对应角色头像加一个柔和的金色光晕呼吸效果（与首页 `#c9a84c` 色调一致），让"正在说话"的感觉延伸到角色身份本身。

### 3. 缓存与体验

- 同一条消息已生成过音频 → 本地 IndexedDB 缓存 MP3，再次播放秒开、不消耗额度
- 移动端进入聊天页时预热 AudioContext（避免 iOS 首次播放静音）

### 4. 设置项（Settings 页）

新增一栏"语音"：

- 开关：启用消息语音播放（默认开）
- 播放速度：0.85× / 1× / 1.15×（覆盖角色默认 speed）
- 音量滑块

## 四、技术实现

### 后端：Edge Function `tts-speak`

- 路径：`supabase/functions/tts-speak/index.ts`
- 输入：`{ agentId, text, messageId }`
- 流程：
  1. 校验 JWT、限制文本长度（≤ 800 字符，超过截断）
  2. 根据 `agentId` 查表取 voiceId + voice_settings
  3. 调 `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}?output_format=mp3_44100_128`，使用 `eleven_multilingual_v2`
  4. 直接以 `audio/mpeg` 流式返回（lower TTFB）
- 错误：401/429/402 透传可读消息

### 前端

- 新文件 `src/lib/ttsClient.ts`：封装请求 + IndexedDB（idb-keyval）缓存，按 `sha1(agentId+text)` 作 key
- 新文件 `src/hooks/useTTS.ts`：管理全局单例 `<audio>`、当前播放 messageId、loading/playing 状态
- 新组件 `src/components/MessageVoiceButton.tsx`：上面三态按钮
- `src/pages/Chat.tsx`：渲染消息时挂载按钮；流式完成（`status === 'done'`）后才启用
- `src/data/agents.ts`：新增 `voice: { id, stability, similarityBoost, style, speed }` 字段
- `src/components/AgentCard.tsx` / 聊天头像处：接 `useTTS()` 取当前播放角色，加 `animate-pulse` 风格的金色光晕

### 接入 ElevenLabs

- 通过 Lovable Cloud 的 ElevenLabs Standard Connector 连接（避免手工密钥），同步出 `ELEVENLABS_API_KEY` 供 Edge Function 使用
- 实现首步会引导你完成 Connect 流程

## 五、文件清单（实现阶段）

新增：

- `supabase/functions/tts-speak/index.ts`
- `src/lib/ttsClient.ts`
- `src/hooks/useTTS.ts`
- `src/components/MessageVoiceButton.tsx`
- `src/contexts/TTSContext.tsx`（全局播放状态）

修改：

- `src/data/agents.ts`（加 voice 字段）
- `src/pages/Chat.tsx`（消息气泡接按钮 + 头像光晕）
- `src/pages/Settings.tsx`（语音设置）
- `src/i18n/locales/{zh,en}.json`（按钮/设置文案）
- `package.json`（加 `idb-keyval`）

## 六、待你确认

1. 上表 4 个 voiceId 是否直接采用，还是你想去 ElevenLabs 试听后告诉我新的 ID？//直接采用吧
2. 是否同意走 ElevenLabs Connector（推荐，零密钥管理）？//同意