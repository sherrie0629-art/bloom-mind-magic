## 手机端首页排版优化

### 问题诊断
当前手机端（390×844 预览）首屏仅显示约 2 个板块，信息密度低，原因：
- 标题字号过大：`text-4xl` Hero 标题、`text-2xl` 卡片标题在手机端显得巨型
- 内边距过大：`p-8` / `p-6` / `gap-4` 在窄屏浪费空间
- 圆角过大：`rounded-3xl` 在移动端视觉占比过高
- 衬线字体本身视觉膨胀，小字号下更需控制

### 优化方向
在手机端（`md:` 以下）统一收紧字号、间距、内边距，提升首屏信息密度，桌面端保持不变。

### 具体改动

**src/pages/Index.tsx**

1. **全局容器**
   - 外层 `p-5 md:p-10` → `p-4 md:p-10`
   - 网格 `gap-4` → `gap-3 md:gap-4`

2. **Hero 品牌区**
   - 标题 `text-4xl md:text-6xl` → `text-3xl md:text-6xl`
   - 副标题 `text-3xl md:text-5xl` → `text-2xl md:text-5xl`
   - Slogan `text-base md:text-lg` → `text-sm md:text-lg`
   - 内边距 `p-8 md:p-10` → `p-5 md:p-10`
   - 最小高度 `min-h-[260px]` → `min-h-[200px]`

3. **每日塔罗 / 缘分配对**
   - 标题 `text-2xl` → `text-xl md:text-2xl`
   - 内边距 `p-6` → `p-4 md:p-6`
   - 圆角 `rounded-3xl` → `rounded-2xl md:rounded-3xl`

4. **自我探索**
   - 区标题 `text-2xl md:text-3xl` → `text-xl md:text-3xl`
   - 内边距 `p-6 md:p-7` → `p-4 md:p-7`
   - 子卡片标题 `text-lg` → `text-base md:text-lg`
   - 子卡片内边距 `p-4 md:p-5` → `p-3 md:p-5`

5. **AI 角色四宫格**
   - 区标题 `text-2xl md:text-3xl` → `text-xl md:text-3xl`
   - 卡片内边距 `p-3 md:p-4` → `p-2.5 md:p-4`
   - 卡片圆角 `rounded-3xl` → `rounded-2xl md:rounded-3xl`
   - 图片容器圆角 `rounded-2xl` → `rounded-xl md:rounded-2xl`
   - 名字 `text-lg` → `text-base md:text-lg`

6. **秘密提示横幅**
   - 标题 `text-base md:text-lg` → `text-sm md:text-lg`
   - 内边距 `p-5 md:p-6` → `p-4 md:p-6`
   - 按钮尺寸不变，但适配 `self-stretch md:self-auto`

### 预期效果
手机端首屏从约 2 个板块提升至 4~5 个板块可见，信息密度显著提升，同时保留黑金质感与品牌调性。桌面端完全不受影响。