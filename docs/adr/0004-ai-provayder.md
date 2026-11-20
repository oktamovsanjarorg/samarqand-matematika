# ADR-0004: AI provayderi va yechim tekshiruvi

- Sana: 2026-11-20 · Holat: qabul qilindi (provayder tanlovi Q-03 baholash to'plamidan keyin tasdiqlanadi)

## Kontekst

Haftalik testda o'quvchi har savolga daftardagi yechim rasmini yuklaydi (BR-W04). AI rasmni o'qishi (vision), qadamlarni tekshirishi va tuzilgan hukm qaytarishi kerak. AI hukmi taklif xolos (BR-W06), shubha o'quvchiga ko'rsatilmaydi (BR-W05), AI o'chiq bo'lsa ham oqim ishlaydi. Q-03 da Claude, Gemini va GPT'ni real yechimlar ustida solishtirish rejalashtirilgan.

## Qaror

- **`AiProvider` interfeysi** (`apps/api/src/ai/ai-provider.ts`): `checkSolution(input) → SolutionVerdict | null`. `null` — AI o'chiq yoki hukm berolmadi; savol ustoz navbatiga AI hukmisiz tushadi.
- **Hukm sxemasi** `packages/shared/src/ai.ts` (`solutionVerdict`, zod): `verdict` (7 tur, PLAN §6), `confidence` (LOW/MEDIUM/HIGH), `answerFollows`, `steps`, `copySignals`, `teacherNote`, `studentFeedback`. Sxema structured outputs bilan majburlanadi, javob yana zod bilan tekshiriladi.
- **Birinchi provayder: Claude** (`claude.provider.ts`), rasmiy `@anthropic-ai/sdk` 1.6.0, model `claude-opus-5-5` (`AI_MODEL` bilan o'zgaradi):
  - `output_config.format` (zod sxema) va `effort: "high"`: baholash aniqlik talab qiladi, Opus 5.5 da standart `medium`;
  - `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`): model rad etsa, server shu so'rovni zaxira modelda qayta ishlaydi;
  - system prompt barqaror va keshlanadi (`cache_control`), savol va rasmlar undan keyin keladi;
  - `refusal`, `max_tokens`, tarmoq yoki sxema xatosi — `null` va logda faqat xato turi (kalit va matn yozilmaydi).
- **Env**: `AI_PROVIDER` = `off` (standart) | `claude`; `claude` uchun `ANTHROPIC_API_KEY` majburiy (zod). Kalit faqat `.env` da.
- **Baholash to'plami** (`apps/api/test/ai-eval.test.ts`, `pnpm --filter @samarqand/api ai:eval`): `AI_EVAL_DIR` dagi holatlar (`case.json` + rasmlar, ustoz hukmi bilan). Real yechimlar shaxsiy ma'lumot, repoga tushmaydi. Natija: aniqlik, ko'chirishni topish va noto'g'ri shubhalar soni. Har prompt yoki model o'zgarganda qayta o'lchanadi.

## Oqibatlar

- Gemini yoki GPT qo'shish — yangi `AiProvider` sinfi va `AI_PROVIDER` qiymati; qolgan kod o'zgarmaydi.
- To'plam bo'lmaguncha production'da `AI_PROVIDER=off`: haftalik test va ustoz navbati AI'siz ishlaydi.
- Xarajat: bitta savol — bitta so'rov (1–3 rasm). Kunlik chegara `AI_DAILY_LIMIT` (standart 300).
- **Navbat (T-033)**: BullMQ o'rniga bazadagi `AiReview` jadvali va haftalik rejalashtiruvchi (har daqiqada 5 tadan). Har yozuv `updateMany` sharti bilan egallab olinadi, 3 martagacha qayta urinadi, 10 daqiqa osilib qolgan `RUNNING` qayta olinadi. Hozirgi hajmda Redis navbati kerak emas; hajm oshsa BullMQ'ga o'tish faqat shu xizmatni almashtiradi.
- **Shubha** (`suspected`): AI `SUSPECTED_COPY` desa yoki kamida ikki belgi topsa. O'quvchiga hech qayerda qaytmaydi (BR-W05), ustoz navbatida birinchi turadi (T-034). Serverdagi qo'shimcha signallar: bir savolga aynan bir xil noto'g'ri javob bergan o'quvchilar, mavzu testlari <50% bo'lib haftalikda ≥90%.
