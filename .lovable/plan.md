## 问题
设置页"中文"是当前选中项，但选中态样式用的是 `border-secondary bg-secondary/10 text-secondary`。在新黑金主题下 `--secondary` 接近黑色（`0 0% 14%`），叠在深色卡片上几乎不可见，看起来像"无法选择"，实际上只是看不到而已。

## 修改

**`src/pages/Settings.tsx`**（语言选择按钮 + 图标）
- 选中态：`border-secondary bg-secondary/10 text-secondary` → `border-primary bg-primary/10 text-primary`
- Globe 图标：`text-secondary` → `text-primary`

与之前 BottomNav / DesktopLayout 的修复保持一致，统一改为金色 `primary`。仅样式类改动，不动逻辑。
