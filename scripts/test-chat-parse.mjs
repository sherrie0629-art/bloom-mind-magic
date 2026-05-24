import { parseGameMarkers, resolveDisplayContent } from "../src/lib/parseGameMarkers.ts";

const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const URL = process.env.VITE_SUPABASE_URL + "/functions/v1/chat";

async function fetchReply(body) {
  const resp = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`${resp.status} ${t}`);
  }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const p = JSON.parse(jsonStr);
        full += p.choices?.[0]?.delta?.content || "";
      } catch { /* */ }
    }
  }
  return full;
}

const prompts = [
  { label: "conflict", messages: [{ role: "user", content: "我不知道该怎么办，心里很矛盾" }] },
  { label: "short", messages: [{ role: "user", content: "嗯" }] },
  { label: "happy", messages: [{ role: "user", content: "今天超开心！被夸了！" }] },
];

for (const p of prompts) {
  const full = await fetchReply({
    messages: p.messages,
    agentId: "bestie",
    bondLevel: 4,
    locale: "zh",
  });
  const parsed = parseGameMarkers(full);
  const display = resolveDisplayContent(full, parsed.cleanContent, parsed.branchOptions, "zh");
  console.log("\n---", p.label, "---");
  console.log("raw len:", full.length);
  console.log("raw tail:", full.slice(-120));
  console.log("display len:", display.length);
  console.log("display empty?", !display.trim());
  console.log("opts:", parsed.branchOptions?.length ?? 0);
}
