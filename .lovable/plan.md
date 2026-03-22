

## 计划：全面切换到豆包 API（文本推理 + 图片生成），无降级回退

### 概述
将所有 AI 模型服务从 Lovable AI Gateway 完全切换到火山引擎豆包 API：
- **文本推理**：豆包 2.0 Pro
- **图片生成**：Seedream 模型
- **无降级回退**：任何场景下都不回退到 Lovable AI，失败时直接返回错误

### 需要配置的密钥（5 个）
1. **DOUBAO_API_KEY** — 文本推理 API Key
2. **DOUBAO_ENDPOINT_ID** — 豆包 2.0 Pro 非流式接入点 ID
3. **DOUBAO_STREAM_ENDPOINT_ID** — 豆包 2.0 Pro 流式接入点 ID
4. **DOUBAO_IMAGE_API_KEY** — Seedream 图片生成 API Key（若与文本同一个 key 请告知）
5. **DOUBAO_IMAGE_ENDPOINT_ID** — Seedream 图片生成接入点 ID

### 改动内容

#### 1. 配置密钥
使用密钥管理工具添加上述 5 个密钥。

#### 2. 重写所有 Edge Function 的 AI 调用逻辑
**涉及 10 个文件：**
`chat`、`assessment`、`assessment-bazi`、`assessment-emotion`、`assessment-zodiac`、`assessment-compatibility`、`daily-whisper`、`generate-deep-report`、`generate-soul-fragment`、`summarize-conversation`

改动：
- 移除 `getAIConfig()` 中的 provider 查询和 lovable 分支，直接硬编码豆包配置
- **移除 `getLovableFallback()` 函数**
- **移除 `fetchAI()` 中的 try-catch 降级逻辑**，失败时直接抛错
- 简化为直接调用豆包 API，错误透传给客户端

#### 3. 改造图片生成函数
**文件：** `generate-poster-image/index.ts`

切换到火山引擎 Seedream 的 `/api/v3/images/generations` 接口：

```text
API: POST https://ark.cn-beijing.volces.com/api/v3/images/generations
请求体: { model: ENDPOINT_ID, prompt: "...", size: "1024x1024", response_format: "b64_json" }
响应体: { data: [{ b64_json: "..." }] }
```

#### 4. 部署所有更新的 Edge Function

### 技术说明
- 完全移除对 Lovable AI Gateway 的所有引用
- 失败时直接返回错误信息给用户，不做任何降级
- 无需数据库改动

