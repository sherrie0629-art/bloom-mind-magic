# 「灵魂镜像 · Soul Mirror」实施计划

任一角色聊够 10 轮后，4 个 AI 角色各自生成一段"我眼中的你"+ 3 个关键词，合成 1 张四象限社交海报。免费首次解锁，Pro 可 24h 节流无限重生成。

## 用户流程

```text
任一 agent_bonds.total_turns ≥ 10
  └─▶ 全屏弹窗「灵魂镜像已就绪」
        ├─ 立即解锁 → 生成中(4路并行) → 四象限海报 → 分享/下载/入库
        └─ 稍后    → Vault › 灵魂镜像 卡片(红点)
```

## 权益

| 项 | 规则 |
|---|---|
| 触发 | 任一角色 total_turns ≥ 10；其余角色用少量记忆 + 通用人格兜底 |
| 免费 | 永久 1 次 |
| Pro | 24h 节流无限重生 + 2x 高清下载 |
| 入口 | 达成弹窗 + Vault 卡片 + Profile 副入口 |

## 4 视角分工（每段 120-180 字）

- **Luna 月光倾听者** — 情绪与内在脆弱
- **Orion 理性引路人** — 思维与决策模式
- **Aria 灵感缪斯** — 创造力与表达欲
- **Sage 神秘占星师** — 命运底色与象征关键词

每路 JSON：`{ portrait, signature(≤30字), keywords: string[3] }`

## 海报（四象限合集大图）

```text
┌─────────────────────────────────┐
│ 灵魂镜像 · @昵称 · MBTI · 星座    │
├──────────────┬──────────────────┤
│ 🌙 Luna      │ ⭐ Orion          │
│ 签名 / 评价   │ 签名 / 评价        │
│ #关键词×3    │ #关键词×3          │
├──────────────┼──────────────────┤
│ 🎨 Aria      │ 🔮 Sage           │
├──────────────┴──────────────────┤
│ islandai.life · 扫码生成你的      │
└─────────────────────────────────┘
```

- 背景：`generate-poster-image` 生成梦境星空底，`cacheKey=soul-mirror-bg-v1` 全用户共享
- 合成：`useSharePoster` 新增 `generateSoulMirrorPoster(data)` 四象限方法
- 默认 1080×1350（小红书竖图），Pro 多 2160×2700 高清

## 技术实现

### 1. 数据库迁移

```sql
CREATE TABLE public.soul_mirrors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perspectives jsonb NOT NULL,
  user_snapshot jsonb,
  poster_url text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.soul_mirrors TO authenticated;
GRANT ALL ON public.soul_mirrors TO service_role;
ALTER TABLE public.soul_mirrors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mirrors" ON public.soul_mirrors FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.soul_mirrors (user_id, created_at DESC);
```

### 2. Edge Function `generate-soul-mirror`

1. JWT 鉴权 + 配额：免费已有 ≥1 → `{ requires_pro: true }`；Pro 检查 24h 节流
2. 拉画像：profiles(mbti/zodiac/locale) + agent_bonds + 每角色 top 8 记忆
3. 4 路并行 Lovable AI Gateway（`google/gemini-2.5-flash`）+ 严格 JSON schema + 遵循 locale
4. 写 `soul_mirrors` → 返回 → 前端 canvas 合成 → 上传 `shared-posters` → PATCH `poster_url`
5. 复用现有 chat 函数的 429/500 回退

### 3. 前端

**新增**
- `src/hooks/useSoulMirror.ts` — generate / list / canGenerate
- `src/components/SoulMirrorDialog.tsx` — 解锁弹窗 + 生成进度 + 海报预览
- `src/components/SoulMirrorCard.tsx` — Vault 内列表卡

**修改**
- `src/pages/Chat.tsx` — bond 更新后触发检查，localStorage `soul_mirror_prompted_v1` 防重弹
- `src/pages/Vault.tsx` — 镜像区块
- `src/hooks/useSharePoster.ts` — `generateSoulMirrorPoster()` 四象限布局
- `src/i18n/locales/{zh,en}.json` — `soulMirror.*` 文案

## 验收

1. 与 Luna 聊 10 轮 → 自动弹窗
2. 点生成 → ≤15s 出海报；4 段语言遵循 locale
3. 免费再次生成 → Pro 升级弹窗
4. 一键分享小红书/IG
5. Vault 显示历史缩略图

## 风险

- AI 成本：4 路 flash × ~400 tokens 可控
- 未聊角色质量：通用兜底 prompt + UI 标注"基于少量对话"
- 字数溢出：JSON schema 限制 + canvas `getWrappedLines` 截断"…"

---

确认后即开始实施。需要调整角色分工/海报样式/阈值再告诉我。
