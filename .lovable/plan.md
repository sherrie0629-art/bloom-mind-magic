

## 方案：全局中文残留清理 + "能量/碎片"机制北美本地化

本方案覆盖所有仍包含中文的前端组件、页面、hooks 和 Edge Functions，共约 **20+ 个文件**。

---

### 一、"能量/碎片/真相"机制的北美本地化重命名

| 原概念 | 新概念 | 说明 |
|--------|--------|------|
| 能量 (⚡Energy+N) | **Vibe Points** / **Vibes** | 北美 Gen Z 更熟悉 "vibe" |
| 灵魂碎片 | **Soul Fragment** | 保留，已在英文中自然 |
| 真相碎片 | **Truth Shard** | 保留，已在英文中自然 |
| 灵魂星图 | **Soul Map** | 保留 |
| 成就解锁 | **Achievement Unlocked** | 保留 |

---

### 二、需要修改的文件清单

#### 前端组件（共 10 个）

| 文件 | 中文内容 | 改为 |
|------|----------|------|
| `EnergyFloat.tsx` | `+{gain} 能量` | `+{gain} Vibes` |
| `TruthShardPopup.tsx` | `真相碎片获得！`、`收入收藏夹 ✨` | `Truth Shard Found!`、`Add to Collection ✨` |
| `AchievementUnlock.tsx` | `🏆 成就解锁`、`太棒了！` | `🏆 Achievement Unlocked`、`Amazing!` |
| `EasterEggEffect.tsx` | `隐藏记忆已解锁` | `Hidden Memory Unlocked` |
| `BranchSelector.tsx` | 情绪 key（勇敢/温柔/理性等）→ 英文 | `brave/gentle/rational/rebellious/curious/sad/hopeful/angry` |
| `SoulUniverse.tsx` | `灵魂星图`、`颗星`、`个星座`等 | `Soul Map`、`stars`、`constellations` |
| `PosterPreviewDialog.tsx` | `长按图片保存到相册`、`测评海报`、`保存到本地` | `Long-press to save`、`Assessment poster`、`Save to device` |
| `ResultAIImage.tsx` | `AI 生成插画` | `AI generated artwork` |
| `ChatParticles.tsx` | 无中文文本，跳过 |
| `AgentCard.tsx` | 无中文文本，跳过 |

#### 前端页面（共 8 个）

| 文件 | 中文内容概要 |
|------|-------------|
| `AssessmentReports.tsx` | 标题/标签/日期格式/空状态全部中文 |
| `AssessmentDetail.tsx` | 维度标签、深度报告描述、价格（¥→$）、所有 UI 文案 |
| `CompatibilityDetail.tsx` | 维度标签、标题、日期格式 |
| `CompatibilityReports.tsx` | 标题、空状态、日期格式 |
| `Admin.tsx` | 管理后台全部中文（标签/统计/操作按钮/货币） |
| `BaziFlow.tsx` | 整个页面仍是中文八字 — 已有 EnneagramFlow 替代，考虑保留作为旧路由兼容但无需翻译 |
| `Chat.tsx` | 一处残留中文注释/标记已在上轮修复 |
| `streamChat.ts` | 错误消息 `请求失败`、`无法获取响应流` |

#### Hooks（1 个）

| 文件 | 中文内容 |
|------|----------|
| `useSoulFragment.ts` | `✨ 获得新的灵魂碎片：${data.name}` |
| `useSharePoster.ts` | `正在生成精美海报…`、`海报已保存 ✨`、`保存失败`、`心灵密语 · AI 心理测评`、`维度分析`、字体引用 `Noto Serif/Sans SC` |

#### Edge Functions（2 个）

| 文件 | 中文内容 |
|------|----------|
| `generate-soul-fragment/index.ts` | 整个 prompt 和 tool description 全中文 |
| `generate-deep-report/index.ts` | typeLabels、错误消息、整个 3000 字 prompt 全中文 |
| `summarize-conversation/index.ts` | 整个 prompt 和 tool description 全中文 |

---

### 三、具体改动

#### 1. `BranchSelector.tsx`
- emotionMap key 从中文改为英文（`brave`, `gentle`, `rational`, `rebellious`, `curious`, `sad`, `hopeful`, `angry`）
- 与 `parseGameMarkers.ts` 中的 `VALID_EMOTIONS` 保持一致

#### 2. `EnergyFloat.tsx`
- `+{gain} 能量` → `+{gain} Vibes`

#### 3. `TruthShardPopup.tsx`
- 全部 UI 文案英文化

#### 4. `AchievementUnlock.tsx`
- `成就解锁` → `Achievement Unlocked`，`太棒了！` → `Amazing!`

#### 5. `EasterEggEffect.tsx`
- `隐藏记忆已解锁` → `Hidden Memory Unlocked`

#### 6. `SoulUniverse.tsx`
- 所有中文标签英文化

#### 7. `PosterPreviewDialog.tsx` + `ResultAIImage.tsx`
- alt 文本和按钮文案英文化

#### 8. `AssessmentReports.tsx`
- typeConfig 标签英文化、日期格式改为 `en-US`、空状态文案英文化

#### 9. `AssessmentDetail.tsx`
- 所有维度标签英文化（E/I, S/N, T/F, J/P 保留；bazi→enneagram；zodiac/emotion 标签英文化）
- 深度报告区块文案英文化、价格从 `¥9.9` 改为 `$4.99`
- 预览文案英文化

#### 10. `CompatibilityDetail.tsx`
- DIM_LABELS 英文化、日期格式 `en-US`、标题/小节标题英文化

#### 11. `CompatibilityReports.tsx`
- 标题、空状态、日期格式英文化

#### 12. `Admin.tsx`
- 所有 tab/标签/统计标签/按钮/toast 消息英文化，货币 `¥` → `$`

#### 13. `streamChat.ts`
- 错误消息英文化

#### 14. `useSoulFragment.ts`
- toast 消息英文化

#### 15. `useSharePoster.ts`
- 所有 toast 消息英文化
- `心灵密语 · AI 心理测评` → `MindGarden AI`
- `维度分析` → `Dimensions`
- 字体引用从 `Noto Serif SC / Noto Sans SC` 改为 `DM Serif Display / Inter`

#### 16. `generate-soul-fragment/index.ts`
- 完整 prompt 英文化："You are a poetic soul fragment naming specialist..."
- tool description 英文化

#### 17. `generate-deep-report/index.ts`
- typeLabels 英文化
- 错误消息英文化
- 整个系统提示词重写为英文（保留 therapy-speak 风格：attachment theory, defense mechanisms, boundaries）
- 用户消息英文化

#### 18. `summarize-conversation/index.ts`
- 整个 prompt 和 tool schema 英文化

---

### 执行顺序

1. 前端组件批量英文化（10 个文件并行）
2. 前端页面英文化（8 个文件）
3. Hooks 英文化（2 个文件）
4. Edge Functions 重写部署（3 个文件）

