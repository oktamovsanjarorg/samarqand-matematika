---
description: Vazifani (T-XXX) playbook bo'yicha boshidan oxirigacha bajarish
argument-hint: T-XXX
---

Vazifa: $ARGUMENTS

1. `CLAUDE.md` va `docs/12-ai-playbook.md` ni o'qi (kontekstda bo'lsa, qayta o'qima).
2. `docs/09-tasks.md` dan $ARGUMENTS ni top va 🟨 qil. Tegishli BR, FR va `10-open-questions.md` ni o'qi.
3. Qisqa reja yoz (fayllar ≤300 qator, endpoint'lar, ruxsatlar, testlar) va darhol bajar.
4. Avval testlar, keyin kod. Oxirida `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build` ishga tushir.
5. Noaniqlik bo'lsa, playbook §2 bo'yicha o'zing qaror qil va qarorni yozib qo'y.
6. Hujjatlarni yangila, vazifani ✅ qil. Yakunda o'zbek tilida qisqa hisobot ber.
