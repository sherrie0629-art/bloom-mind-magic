

## 方案：生成产品需求文档 + 技术架构文档

为 MindGarden AI 项目生成两份 PDF 文档，沉淀当前产品和技术的完整设计。

### 文档一：产品需求文档（PRD）
包含以下章节：
- **产品概述**：MindGarden AI 定位、目标用户（北美 Gen Z/Millennial）
- **AI 角色体系**：4 个角色（Chloe/Dr. Maya/Luna/Zoe）的完整人设、对话风格、背景故事（Lore 5 级）、彩蛋触发词
- **RPG 游戏化机制**：Energy/Vibes 系统、Truth Shard、Branch Options、Mood Atmosphere、Bond 等级（Stranger→Soulbound）
- **测评体系**：MBTI、Enneagram、Horoscope、Wellness Check、Relationship Chemistry
- **成就系统**：13 个成就定义及触发条件
- **Soul Map 灵魂星图**：可视化收集展示
- **Daily Check-in 每日签到**
- **付费策略**：Free/Premium 分层、每日用量限制、深度报告单次购买（$4.99）
- **页面路由总览**

### 文档二：技术架构文档
包含以下章节：
- **技术栈**：React 18 + Vite 5 + Tailwind + TypeScript + Supabase (Lovable Cloud)
- **全局架构图**（ASCII）
- **数据库 Schema**：17 张表的结构与关系
- **Edge Functions**：11 个函数的职责与 AI 模型选择
- **前端架构**：路由、组件、Hooks、Context
- **核心数据流**：聊天流（SSE streaming）、测评流、游戏标记解析流
- **认证与权限**：Auth + RLS + user_roles
- **AI 集成**：Lovable AI Gateway、模型选择、流式响应

### 执行方式
- 使用 Python (reportlab) 生成两份 PDF
- 输出到 `/mnt/documents/`
- 提供下载链接

