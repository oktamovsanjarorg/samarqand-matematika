import { APP_URL } from "../content";

export function Footer() {
  return (
    <footer className="border-t border-hint/15">
      <div className="wrap flex flex-col gap-4 py-8 text-sm text-hint sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} Samarqand matematika</span>
        <nav aria-label="Sayt" className="flex flex-wrap gap-x-5 gap-y-2">
          <a href="/#imkoniyatlar" className="hover:text-brand">
            Imkoniyatlar
          </a>
          <a href="/#savollar" className="hover:text-brand">
            Savollar
          </a>
          <a href="/sitemap.html" className="hover:text-brand">
            Sayt xaritasi
          </a>
          <a href={`${APP_URL}/admin/`} className="hover:text-brand">
            Ustozlar uchun kirish
          </a>
        </nav>
      </div>
    </footer>
  );
}
