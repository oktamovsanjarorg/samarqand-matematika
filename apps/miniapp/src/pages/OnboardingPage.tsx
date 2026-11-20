import { fullName, type MyProfile } from "@samarqand/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import { useState, type FormEvent } from "react";
import { post } from "../lib/api";
import { tg } from "../lib/telegram";

const btn =
  "tap flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand font-bold text-white disabled:opacity-50";

function NameStep() {
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const parsed = fullName.safeParse(value);
  const save = useMutation({
    mutationFn: () => post<MyProfile>("/me/name", { fullName: value }),
    onSuccess: (p) => qc.setQueryData(["profile"], p),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (parsed.success) save.mutate();
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-semibold">Ism va familiyangiz</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Masalan: Aziz Karimov"
          autoComplete="name"
          className="h-12 w-full rounded-xl border border-hint/25 bg-section px-4 text-[15px]"
        />
      </label>
      {value.trim().length > 2 && !parsed.success && (
        <p className="text-sm text-danger">{parsed.error.issues[0]?.message}</p>
      )}
      <p className="text-xs text-hint">
        Ustoz sizni shu ism bilan koʻradi. Qabul qilingandan keyin ismni faqat ustoz oʻzgartiradi.
      </p>
      <button type="submit" className={btn} disabled={!parsed.success || save.isPending}>
        Davom etish
      </button>
      {save.error && <p className="text-sm text-danger">{save.error.message}</p>}
    </form>
  );
}

/** Raqam bot orqali keladi (BR-S02): bosilgandan keyin profil raqam saqlanguncha qayta so'raladi */
function PhoneStep() {
  const [asked, setAsked] = useState(false);
  useQuery({ queryKey: ["profile"], enabled: asked, refetchInterval: 2000 });
  const supported = !!tg?.requestContact;
  const ask = () => {
    tg?.requestContact?.(() => setAsked(true));
    setAsked(true);
  };
  return (
    <div className="space-y-3">
      <p className="text-[15px]">
        Ustoz siz bilan bogʻlana olishi uchun Telegram raqamingizni ulashing. Raqam faqat ustoz va
        yordamchilarga koʻrinadi.
      </p>
      {supported ? (
        <button type="button" onClick={ask} className={btn}>
          <Phone size={18} /> Raqamni ulashish
        </button>
      ) : (
        <p className="text-sm text-hint">
          Telegram ilovangizni yangilang yoki botga qaytib raqamni ulashing.
        </p>
      )}
      {asked && <p className="text-sm text-hint">Raqam kutilmoqda…</p>}
    </div>
  );
}

export function OnboardingPage({ profile }: { profile: MyProfile }) {
  const step = profile.fullName ? 2 : 1;
  return (
    <div className="flex min-h-full flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src="/logo.jpg" alt="" className="h-24 w-24 rounded-card" />
        <h1 className="text-xl font-extrabold text-brand">Xush kelibsiz!</h1>
        <p className="text-sm text-hint">{step}/2-qadam</p>
      </div>
      <div className="card">{step === 1 ? <NameStep /> : <PhoneStep />}</div>
    </div>
  );
}
