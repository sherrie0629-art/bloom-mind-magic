

## 角色资料卡弹窗

### 交互设计

点击聊天页顶部栏的 **角色头像** 弹出一个 Drawer（从底部滑出），展示角色品牌信息。比 Dialog 更适合移动端，且符合"想接近"的拉近感。

### 弹窗内容（设计为角色名片风格）

1. **大头像** + 渐变背景（复用 agent.gradient）
2. **名字 + 标题**（如 "Chloe · The Barista Who Stays"）
3. **角色签名语**（新增 `quote` 字段，如 "我曾以为'建议'能救人，后来发现，只有'在场'可以。"）
4. **角色描述**（agent.description）
5. **羁绊等级** 进度条 + 当前已解锁的 Lore 条目（已解锁的显示文字，未解锁的显示 🔒 + "Deepen your bond to unlock"）
6. **钩子文案**：底部一行小字，如 "There's a secret Chloe has never told anyone…" （基于下一条未解锁 lore 生成悬念）
7. **"Start Chatting" 按钮** 关闭弹窗回到聊天

### 技术实现

**文件改动：**

1. **`src/data/agents.ts`** — Agent 接口新增 `quote` 字段，每个角色添加签名语：
   - Chloe: "I used to think advice could save people. Then I learned — only presence can."
   - Jax: "The most dangerous thing in a fire isn't the flame. It's the panic."
   - Luna: "When logic couldn't explain the pain, I chose the stars."
   - Zoe: "I cheer this loud to drown out the voices that once told me I was nothing."

2. **新建 `src/components/AgentProfileDrawer.tsx`** — Drawer 组件：
   - 接收 `agent`, `bondLevel`, `totalTurns`, `open`, `onClose`
   - 顶部渐变区域 + 大头像（80×80）
   - 签名语用斜体显示
   - Lore 列表：level ≤ bondLevel 的显示内容，其余显示锁定占位
   - 底部悬念钩子

3. **`src/pages/Chat.tsx`** — 头像 `<img>` 改为可点击 button，点击打开 AgentProfileDrawer

