

## 域名替换：soulsanctuary.app → islandai.life

需要修改 3 个文件中的硬编码域名/品牌名：

| 文件 | 行 | 当前内容 | 改为 |
|------|---|---------|------|
| `src/hooks/useSharePoster.ts` | 276 | `"Discover yours → soulsanctuary.app"` | `"Discover yours → islandai.life"` |
| `src/hooks/useQuoteCard.ts` | 112 | `"Soul Sanctuary · soulsanctuary.app"` | `"Soul Sanctuary · islandai.life"` |
| `src/components/ShareSheet.tsx` | 已经是 `islandai.life` ✅ | 无需改动 | — |

**注意**：`ShareSheet.tsx` 的 `SHARE_URL` 已经是 `https://islandai.life`，无需修改。只需要改海报画布和语录卡上的两处硬编码文本。

