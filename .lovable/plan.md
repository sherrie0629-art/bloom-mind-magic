## 目标

当前 5 个测评（MBTI / 九型 / 心灵体验 / 八字 / 星座）结果页生成的 AI 图片提示词都比较通用抽象（soft geometric shapes / abstract flowing shapes 等），尤其**九型人格**和**心灵体验**两张图与测评主题关联弱、画风过于抽象。本次将整体梳理 5 个 `getImagePrompt`，让每张图：

1. 与测评主题/具体类型**强相关**（让看图就能感觉出"这是 INFP / 4 号 / 高能量状态"）
2. 九型 & 心灵体验改为**生动、有趣、活泼、有艺术感**的具象插画风（不再是抽象色块）
3. MBTI / 八字 / 星座保持各自气质，但做更具体的视觉锚点

所有改动只涉及前端 5 个 Flow 文件中的 `getImagePrompt` 函数，**不动后端**。

## 具体方案

### 1. 九型人格（EnneagramFlow.tsx）— 重点改
风格定位：**当代角色插画 + 拼贴艺术**，温暖、俏皮、有故事感。

为 9 个类型各加一个"标志性场景/物件"，让画面具象：
- 1 完美主义者 → 整理书桌的剪影、笔直铅笔阵
- 2 助人者 → 端着热可可递出的双手
- 3 成就者 → 奖杯/奖牌堆叠、向上箭头
- 4 自我者 → 月光下作画的人影、漂浮的颜料
- 5 思考者 → 戴耳机的角色周围漂浮书本与公式
- 6 忠诚者 → 灯塔与小船
- 7 热情者 → 热气球、彩色糖果云
- 8 挑战者 → 雄狮剪影、熔岩纹理
- 9 和平者 → 躺在云端的人、温泉水波

新 prompt 模板（注入类型编号 + 场景关键词 + 色调）：
> "Create a playful, modern editorial illustration in a contemporary collage style for Enneagram Type {N} '{title}'. Feature {scene}. Use warm, lively palette of {colors}, soft paper textures, hand-drawn linework, slightly whimsical character vibe (think New Yorker × Apple memoji art). Square format, no text."

并按类型映射 `colors`（1 米白+靛蓝；2 蜜桃+玫瑰；3 金+橘；4 紫+暮蓝；5 橄榄+灰；6 海蓝+琥珀；7 珊瑚+柠檬；8 砖红+焦橙；9 抹茶+奶白）。加 `cacheKey: enneagram-{N}` 复用缓存。

### 2. 心灵体验（EmotionFlow.tsx）— 重点改
风格定位：**温柔治愈系角色插画**（参考 Apple Health / Calm app 插画），有人物/小动物/室内场景，不再是抽象水彩。

按 `result.title` 的能量倾向选场景关键词（在前端做轻判断 / 直接交给 AI 由 title 推断）：
- 充电状态 → 阳台上抱猫晒太阳
- 倦怠/低能量 → 雨天窗边一杯热茶 + 毯子
- 紧绷 → 深呼吸的人 + 漂浮的羽毛
- 平衡 → 在草地野餐看云

新 prompt：
> "Create a cozy, warm editorial illustration depicting a person's emotional state '{title}'. Show a relatable everyday scene that visually expresses this feeling (e.g. soft indoor light, comfort objects, a small companion animal if fitting). Style: gentle gouache + risograph texture, warm rose / coral / butter palette, slightly playful, full of life. Square format, no text."

### 3. MBTI（AssessmentFlow.tsx）— 微调
保留靛蓝/紫色基调，但为 16 类型加"标志性物件"，例如：
- INFP → 漂浮的诗稿与月亮
- ENTJ → 棋盘与城堡剪影
- ESFP → 派对彩带与麦克风
- ISTJ → 打开的怀表与齿轮

模板：
> "Create an abstract-yet-symbolic illustration for MBTI {type} '{title}', featuring {motif}. Deep indigo–violet palette with one warm accent color, mix of geometric and organic shapes, intellectual introspective mood, modern editorial feel. Square format, no text."

加 16 类型 motif 映射表。沿用现有 `cacheKey: mbti-{type}`。

### 4. 八字（BaziFlow.tsx）— 微调
保留中国水墨风，但加入**日主五行**对应的具体意象：
- 甲乙木 → 古松/竹林
- 丙丁火 → 朝阳/烛火
- 戊己土 → 山峦/陶罐
- 庚辛金 → 古剑/铜镜
- 壬癸水 → 江河/月映寒潭

模板：
> "Create an elegant Chinese ink painting for Bazi day master '{dayMaster}' representing '{title}'. Centerpiece: {element_motif}. Warm gold accents on rice-paper texture, refined brushwork, mystical yet grounded. Square format, no text."

加 10 天干 → 意象映射。`cacheKey: bazi-{dayMaster}`。

### 5. 星座（ZodiacFlow.tsx）— 微调
已有 `getImagePromptForSign(signName, element)`，加入**星座代表生物/符号 + 元素粒子**：
- 白羊→公羊角与火星轨迹；金牛→公牛与花田；双子→镜面双人剪影；…

模板：
> "Create a dreamy celestial illustration for the {signName} zodiac, featuring its iconic creature/symbol surrounded by {element} particles (flames/stones/breeze/waves). Cosmic violet & starlight palette, magical art-nouveau line accents. Square format, no text."

加 12 星座 motif 映射。沿用现有 `cacheKey`。

## 涉及文件

- `src/pages/EnneagramFlow.tsx`
- `src/pages/EmotionFlow.tsx`
- `src/pages/AssessmentFlow.tsx`
- `src/pages/BaziFlow.tsx`
- `src/pages/ZodiacFlow.tsx`

## 不改动

- 后端 edge functions、`generate-poster-image` 流程
- `useSharePoster`、海报渲染逻辑、缓存机制
- 测评题目/结果文案

## 缓存说明

九型 / 心灵体验当前**未传 cacheKey**，每次都重新生成。本次会顺便加上：
- 九型 `enneagram-{type}`
- 心灵体验 `wellness-{title hash}`（按 title 简单 slug）

让相同结果复用图，速度更快、成本更低。
