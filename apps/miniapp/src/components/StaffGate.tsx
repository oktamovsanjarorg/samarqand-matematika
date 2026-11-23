import { useState } from "react";
import { absoluteUrl, adminLoginUrl } from "../lib/staff";
import { getInitData, tg } from "../lib/telegram";

/**
 * T-175: kompyuterdagi Telegram'da xodim uchun: admin panel tizim brauzerida ochiladi.
 * Avtomatik ochilmaydi: Telegram tashqi havolani faqat bosish bilan ochadi.
 */
export function StaffGate() {
  const [opened, setOpened] = useState(false);
  const open = () => {
    const url = absoluteUrl(adminLoginUrl(getInitData()));
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, "_blank", "noopener");
    setOpened(true);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <img src="/logo.jpg" alt="" className="h-28 w-28 rounded-card" />
      <h1 className="text-xl font-bold">Boshqaruv paneli</h1>
      <p className="text-[15px] text-hint">
        Kompyuterda panel brauzerda ochiladi. Tugmani bosing, kirish avtomatik boʻladi.
      </p>
      <button type="button" onClick={open} className="tap h-12 rounded-xl bg-brand px-6 font-bold text-white">
        Admin panelni ochish
      </button>
      {opened && (
        <p role="status" className="text-sm text-hint">
          Panel brauzerda ochildi. Bu oynani yopishingiz mumkin.
        </p>
      )}
    </div>
  );
}
