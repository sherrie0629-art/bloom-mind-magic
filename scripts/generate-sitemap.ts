import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://islandai.life";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/assessment", changefreq: "weekly", priority: "0.9" },
  { path: "/assessment/mbti", changefreq: "monthly", priority: "0.8" },
  { path: "/assessment/enneagram", changefreq: "monthly", priority: "0.8" },
  { path: "/assessment/zodiac", changefreq: "monthly", priority: "0.8" },
  { path: "/assessment/emotion", changefreq: "monthly", priority: "0.8" },
  { path: "/assessment/compatibility", changefreq: "monthly", priority: "0.8" },
  { path: "/assessment-reports", changefreq: "weekly", priority: "0.7" },
  { path: "/compatibility-reports", changefreq: "weekly", priority: "0.7" },
  { path: "/daily-tarot", changefreq: "daily", priority: "0.8" },
  { path: "/archive", changefreq: "weekly", priority: "0.7" },
  { path: "/soul-map", changefreq: "weekly", priority: "0.7" },
  { path: "/welcome", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy", changefreq: "yearly", priority: "0.4" },
  { path: "/terms", changefreq: "yearly", priority: "0.4" },
  { path: "/pricing", changefreq: "monthly", priority: "0.7" },
];

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
