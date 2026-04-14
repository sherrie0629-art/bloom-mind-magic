

## 方案：为 Zoe 生成真人感头像

Zoe 当前使用 `agent-bestie.webp`，需要替换为与其他 AI 角色风格一致的真人感头像。

### Zoe 角色定位
- 身份：Your Hype Squad，金毛犬型闺蜜
- 性格：高能量、Gen Z、积极阳光
- 头像风格应匹配：年轻女性、活力四射、温暖笑容

### 执行步骤
1. **使用 Lovable AI 图片生成模型**（`google/gemini-3.1-flash-image-preview`）生成一张真人感头像
   - Prompt：年轻活力的女性，灿烂笑容，温暖氛围，类似其他角色的真人风格头像
2. **保存为 `src/assets/agent-bestie.webp`**，直接替换现有文件
3. 无需修改代码，因为 `agents.ts` 已经引用 `agent-bestie.webp`

