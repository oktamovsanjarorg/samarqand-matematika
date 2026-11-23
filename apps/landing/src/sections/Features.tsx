import { FEATURES, STEPS } from "../content";

export function Features() {
  return (
    <section id="imkoniyatlar" aria-labelledby="f-h" className="wrap space-y-8 py-16">
      <div className="max-w-2xl space-y-3">
        <h2 id="f-h" className="text-3xl font-extrabold">
          Oʻquvchi uchun hamma narsa bir ilovada
        </h2>
        <p className="text-lg text-hint">
          Dars koʻrish, oʻzini tekshirish va xatolar ustida ishlash: har qadam natijada koʻrinadi.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ Icon, title, text }) => (
          <li key={title} className="card space-y-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Icon size={22} aria-hidden />
            </span>
            <h3 className="font-bold">{title}</h3>
            <p className="text-sm text-hint">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Steps() {
  return (
    <section id="qanday" aria-labelledby="s-h" className="bg-surface py-16">
      <div className="wrap space-y-8">
        <h2 id="s-h" className="text-3xl font-extrabold">
          Qanday boshlash
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card space-y-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-extrabold text-white">
                {i + 1}
              </span>
              <h3 className="text-lg font-bold">{s.title}</h3>
              <p className="text-hint">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
