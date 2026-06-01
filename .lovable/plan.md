## 问题

现在「星座宝石」是一条横向 emoji 圆点：
- 只显示符号，看不出是哪个星座，更看不出对应日期；
- 12 个挤不下，必须左右滑动，体验生硬；
- 与上方 MBTI 的「点开 Popover 选」交互不一致。

## 改造方案

把星座区域改成与 MBTI 同款的 **可折叠按钮 + 弹出网格**，语义清晰、无横滑。

### 交互

未选时：
```
[ ✨ 选一个星座（可不选） ▾ ]
```
点开 Popover，里面是 **4 列 × 3 行** 网格，每格：

```
┌──────────┐
│   ♈      │
│  白羊座   │
│ 3.21-4.19│
└──────────┘
```

已选时按钮直接显示所选：
```
[ ♈ 白羊座  3.21-4.19  ✕ ]
```
右侧 ✕ 一键清除，再次点击按钮可重新选择。

### 视觉细节

- 网格格子：`rounded-xl border`，选中态用现有 `bg-gradient-to-br from-gold to-rose-warm text-white shadow-glow`；
- emoji 居中略大（`text-xl`），下方中文名 `text-[11px]`，日期 `text-[10px] text-muted-foreground`；
- Popover 宽度约 `w-[300px]`，内部 `grid-cols-4 gap-2 p-3`；
- 选中后 Popover 自动关闭（受控 `open` 状态，与 MBTI 一致）。

### 文案与数据

在 `src/i18n/locales/zh.json` / `en.json` 的 `assessmentFlow.compatibility` 下：

- 新增 `zodiacPickerEmpty`：「选一个星座（可不选）」/ "Pick a sign (optional)"
- 新增 `zodiacNames`：12 项中文/英文名（白羊座…双鱼座 / Aries…Pisces）
- 新增 `zodiacDates`：12 项日期范围字符串（"3.21-4.19" 等，中英共用）
- 保留旧 `zodiacGemEmpty` 暂不删，防止其它地方引用

### 代码改动（仅前端表现层）

文件：`src/pages/CompatibilityFlow.tsx`

1. 在文件顶部常量区，给 `ZODIAC_SIGNS` 顺序补上一份键名映射（如 `aries…pisces`），并新增 `ZODIAC_DATE_KEYS` 数组（与 `ZODIAC_SIGNS` 对齐）。
2. 删除 311-331 行的横向 strip。
3. 改成 `Popover`（参考 240-310 行 MBTI 的写法），`PopoverTrigger` 是上面描述的按钮，`PopoverContent` 是 4×3 网格，点击格子时 `setZodiac(...)` 并关闭 popover。
4. 提交逻辑、`myZodiac` / `partnerZodiac` 字段、传给后端的 payload 完全不变。

### 不动的部分

- 后端 / `compatibility_reports` 表 / edge function 不动；
- MBTI 选择、特质 chips、其它 step 全部不动；
- 移动端同样适用（网格在 `w-[300px]` 下也能放下，Popover 自适应）。
