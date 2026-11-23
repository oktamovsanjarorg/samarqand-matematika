// Landing (T-173): dist/index.html shabloniga React'dan olingan HTML, SEO teglari, sitemap.xml va robots.txt.
// Manzillar Caddy shabloni orqali qo'yiladi (deploy/Caddyfile, templates): sayt = so'rov hosti, ilova = DOMAIN.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const ssr = new URL("../dist-ssr/render.js", import.meta.url);
const { pages } = await import(ssr.href);

const SITE = "https://{{.Host}}";
// Backtick: shablon qayta ishlanmagan bo'lsa ham (vite preview) HTML atributi buzilmaydi
const APP = "https://{{env `DOMAIN`}}";
const fill = (s) => s.replaceAll("__SITE__", SITE).replaceAll("__APP__", APP);
const esc = (s) => s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Samarqand matematika",
  url: `${SITE}/`,
  logo: `${SITE}/logo.jpg`,
});

function head(p) {
  const url = `${SITE}${p.path}`;
  return [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="uz_UZ" />`,
    `<meta property="og:site_name" content="Samarqand matematika" />`,
    `<meta property="og:title" content="${esc(p.title)}" />`,
    `<meta property="og:description" content="${esc(p.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE}/logo.jpg" />`,
    `<meta name="twitter:card" content="summary" />`,
    p.path === "/" ? `<script type="application/ld+json">${jsonLd}</script>` : "",
  ].join("\n    ");
}

const template = readFileSync(`${dist}index.html`, "utf8");
const list = pages();
for (const p of list) {
  const out = template.replace("<!--head-->", head(p)).replace("<!--app-->", fill(p.html));
  writeFileSync(`${dist}${p.file}`, out);
}

const today = new Date().toISOString().slice(0, 10);
const urls = list.map((p) => `  <url><loc>${SITE}${p.path}</loc><lastmod>${today}</lastmod></url>`);
writeFileSync(
  `${dist}sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
);
writeFileSync(`${dist}robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
rmSync(fileURLToPath(new URL("../dist-ssr/", import.meta.url)), { recursive: true, force: true });
console.log(`landing: ${list.length} sahifa, sitemap.xml, robots.txt`);
