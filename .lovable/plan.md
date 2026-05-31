## 目标

把现在中规中矩的"姓名 / MBTI / 星座 / 描述"双块表单，改成更有趣、像在填一张"恋爱档案卡 + 八卦小作文"的体验，但保留后端契约（myProfile / partnerProfile 字段不变）。

## 新设计：三幕式输入流（仍在一屏，可滚动）

### 幕一 · 你 vs TA 双角色卡

并排两张可翻转的角色卡：左卡"我方出战 🧙‍♀️"，右卡"对方登场 💘"，中间用一颗跳动的心把两张卡连起来。

每张卡里把字段重新包装成档案：

- 代号：原"名字"，placeholder 换成「叫 TA 什么都行～昵称、绰号、'前任'…」
- 人格徽章：MBTI 改成 popover 弹出 16 个彩色徽章网格（每个 type 带 emoji，如 INFJ 🌙、ENTP ⚡），未选时显示「贴一枚人格徽章」
- 星座宝石：12 星座改成横滑的 emoji 胶囊（♈♉♊…），选中高亮+弹跳
- 一句话画像：textarea 改成「TA 是个怎样的人？一句吐槽也行」，下方 3 个一键填充 chip：「嘴硬心软」「e 人外表 i 人内心」「松弛感拉满」点击追加进 textarea

卡片头部加一枚装饰性"卡牌等级"贴纸，hover 时轻微 tilt + 光泽。

### 幕二 · 关系阶段（"我们正在…"）

把原 STAGE pill 改成横滑的故事卡轮播（5 张），每张大 emoji + 阶段名 + 俏皮副标：
- 暗恋中 👀 在朋友圈点赞但不敢评论
- 暧昧期 💬 凌晨一点还在回消息
- 热恋 🔥 连呼吸都是甜的
- 长期关系 🌿 能一起沉默也舒服
- 一言难尽 🌀 分了又合，合了又想分

点中卡片放大+发光，其它缩小。state 映射到原 stage，key 不变。

### 幕三 · 最近的氛围

VIBE_KEYS 改成 6 格大 emoji 反应面板（深聊💭 / 已读不回👻 / 互发梗图😂 / 共进一餐🍜 / 沉默冷战🧊 / 大吵一架💥），选中触发粒子小动画。

### 提交按钮

文案改成「🎰 摇出我们的恋爱卡面」，按钮加心跳脉冲 + sheen 滚光，hover 微微抖动像在攒能量。

## 视觉与动效

- 整页背景在 bg-gradient-calm 上叠一层非常淡的飘浮爱心/星屑（绝对定位 + framer-motion 慢飘）
- 两张角色卡入场分别从左右滑入，之间画虚线 + 跳动的 ♡
- 所有字段保持"可选"标签，校验逻辑、提交 payload 完全不变

## 技术要点（仅 UI 层）

- 只改 src/pages/CompatibilityFlow.tsx 的 step === "input" 段
- 新增就近内联小组件，或拆到 src/components/compatibility/{RoleCard,StageCarousel,VibeGrid}.tsx
- MBTI popover 用现有 @/components/ui/popover；星座胶囊用 overflow-x-auto；不引入新依赖
- 新增中文文案补到 src/i18n/locales/zh.json，英文同步占位补到 en.json，全部新增 key、不动旧 key
- 提交时仍组装相同的 myProfile / partnerProfile / stage / vibe，后端零改动

## 不动的部分

- 后端 edge function、compatibility_reports 表、loading + result 两个步骤
- 字段语义（MBTI / 星座 / 自由描述 / stage / vibe）
- 校验规则（双方姓名必填、至少一条 my/partner 信息）