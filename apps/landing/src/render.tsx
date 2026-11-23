import { renderToStaticMarkup } from "react-dom/server";
import { FEATURES, SITE_DESCRIPTION, SITE_TITLE } from "./content";
import { Audience } from "./sections/Audience";
import { Faq, Cta } from "./sections/Faq";
import { Features, Steps } from "./sections/Features";
import { Footer } from "./sections/Footer";
import { Header } from "./sections/Header";
import { Hero } from "./sections/Hero";

export interface Page {
  /** dist ichidagi fayl va sitemap'dagi yo'l */
  file: string;
  path: string;
  title: string;
  description: string;
  html: string;
}

function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <Steps />
        <Audience />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}

const SITEMAP_LINKS = [
  ["/", "Bosh sahifa"],
  ["/#imkoniyatlar", "Imkoniyatlar"],
  ["/#qanday", "Qanday boshlash"],
  ["/#ota-onalar", "Ota-onalar uchun"],
  ["/#ustozlar", "Ustoz va yordamchilar uchun"],
  ["/#savollar", "Koʻp beriladigan savollar"],
] as const;

/** Odamlar uchun sayt xaritasi; Google uchun sitemap.xml alohida (prerender) */
function SitemapPage() {
  return (
    <>
      <Header />
      <main className="wrap max-w-3xl space-y-6 py-16">
        <h1 className="text-3xl font-extrabold">Sayt xaritasi</h1>
        <ul className="space-y-2">
          {SITEMAP_LINKS.map(([href, label]) => (
            <li key={href}>
              <a href={href} className="font-semibold text-link underline">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <h2 className="text-xl font-bold">Imkoniyatlar</h2>
        <ul className="list-disc space-y-1 pl-6 text-hint">
          {FEATURES.map((f) => (
            <li key={f.title}>{f.title}</li>
          ))}
        </ul>
      </main>
      <Footer />
    </>
  );
}

export function pages(): Page[] {
  return [
    {
      file: "index.html",
      path: "/",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      html: renderToStaticMarkup(<Home />),
    },
    {
      file: "sitemap.html",
      path: "/sitemap.html",
      title: "Sayt xaritasi | Samarqand matematika",
      description: "Samarqand matematika saytining barcha boʻlimlari.",
      html: renderToStaticMarkup(<SitemapPage />),
    },
  ];
}
