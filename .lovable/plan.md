

## 修复落地页 Hero 区域过高的空白问题

### 问题
Hero section 使用了 `min-h-[85vh]`，在大多数屏幕上会产生大量底部空白。

### 修改
**文件**: `src/pages/Welcome.tsx` (第 87 行)

将 Hero section 的 class 从：
```
min-h-[85vh]
```
改为：
```
min-h-[70vh]
```

同时一并处理上条反馈中的两个修改：
1. **第 109 行**: `navigate("/auth")` → `navigate("/")`（Hero CTA）
2. **第 175 行附近**: 同样的 CTA 按钮 `navigate("/auth")` → `navigate("/")`（底部 CTA）
3. **Soul Discovery 描述**: 将 "Bazi" 替换为 "Horoscope"

共 1 个文件、4 处改动。

