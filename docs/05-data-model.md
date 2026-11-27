# 05: Ma'lumotlar modeli

> Manba: `packages/db/prisma/schema.prisma` (har modelda izoh bor). Bu hujjat umumiy xarita: aloqalar va muhim qoidalar.
> Vaqt `timestamptz`, ko'rsatishda `Asia/Tashkent`. ID'lar `cuid()`.

## Odamlar va kirish

```
User (role: STUDENT | PARENT | ASSISTANT | TEACHER, telegramId (qo'lda kiritilgan o'quvchida bo'sh, T-186), phone, isBlocked, lastSeenAt)
 ├─ StudentProfile (fullName, accessMode AUTO|FREE|CLOSED, acceptedAt, parentCode, groupId)
 │    └─ ParentLink (parentId → User, status PENDING|APPROVED|REJECTED, phone, flags, rejectReason)
 ├─ Subscription (endsAt, reminderStage) ← Payment (status, amountUzs, receiptPath, submittedById: ota-ona yuborgan bo'lsa) ← Plan
 ├─ LoginToken (admin havolasi, 5 daqiqa, bir martalik)
 └─ AuditLog (actorId, action, entity, entityId, data)
AppSetting (kalit → JSON): karta, sozlamalar; `digest:<sana>`: ertalabki xulosa shu kuni yuborilgani (T-139, eskilari o'chiriladi)
```

- Haqiqiy ism `StudentProfile.fullName` da; `User.firstName` har kirishda Telegram'dan yangilanadi. Ism `personName()` bilan olinadi.
- To'liq kirish (BR-A04) hisoblanadi, saqlanmaydi: `accessMode` + `acceptedAt` + tasdiqlangan `ParentLink` + faol `Subscription` (`AccessService`).
- Telefon `User.phone` da, faqat Telegram kontakti orqali yoziladi (BR-S02).

## Kontent va savollar

```
Course → Topic → Lesson (body: Markdown + LaTeX, videoUrl, isFree, isPublished)
           └──── Question (type, text, content, answer, solution, difficulty 1..3, skills[], isPublished)
```

- `order` ota ichida 0 dan; `reorder` endpoint'i bitta tranzaksiyada qayta yozadi.
- Ichi bo'sh bo'lmagan kurs yoki mavzu o'chmaydi (`onDelete: Restrict`, BR-C03).
- **`Question.answer` va `solution` alohida ustunlar.** O'quvchiga savol ko'rinishi tuzilganda bu ustunlar `select` qilinmaydi (BR-Q01). `answer` formati turga qarab `packages/shared/src/question.ts` dagi Zod sxemasida (`codec.ts` saqlash va o'qishni bajaradi).
- Testda ishlatilgan savol o'chirilmaydi (`Restrict`, BR-P05), nashrdan olinadi.
- `TrashItem` (entity, entityId, title, parentId, data, deletedBy): o'chirilgan kurs, mavzu, dars yoki savolning to'liq nusxasi (BR-C06). O'chirish bilan bitta tranzaksiyada yoziladi, ro'yxat ochilganda 30 kundan eskisi o'chiriladi. Faqat bo'sh yoki ishlatilmagan qator o'chgani uchun bitta qatorni tiklash yetarli.

## Testlar

| Test turi | Test                                  | Savollar                          | Urinish                                                                         | Javob                                               |
| --------- | ------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- |
| Mavzu     | Topic                                 | Question (nashr)                  | `TopicAttempt` (`mistakesOnly`: xatolarni qayta ishlash, statistikaga kirmaydi) | `TopicAnswer` (savollar muzlatiladi, BR-P02)        |
| Haftalik  | `WeeklyTest`                          | `WeeklyQuestion`                  | `WeeklyAttempt` (bitta, BR-W02)                                                 | `WeeklyAnswer` + `SolutionPhoto` (1–3) + `AiReview` |
| Mock      | `MockTest` (shablon nusxasi bilan)    | `MockQuestion` (bo'lim, `raschB`) | `MockAttempt` (raw, scaled, deadline)                                           | `MockAnswer`                                        |
| Offline   | `OfflineTest` (fan bo'limlari, Rasch) | —                                 | `OfflineResult` (har savol javobi, ball, daraja, moslangan o'quvchi)            | —                                                   |

- `CheckResult`: `CORRECT`, `WRONG`, `MANUAL` (ustoz tekshiradi).
- Haftalik javobda ustoz qarori (`teacherPoints`, `teacherNote`, `reviewedBy`, `reviewedAt`) avtomatik natija va AI hukmidan ustun (BR-W06). `AiReview.suspected` faqat admin navbatida o'qiladi (BR-W05).
- Rejalashtiruvchi belgilar: `WeeklyTest.announcedAt`, `reminderStage` (0/1/2), `closedAt`; `MockTest.announcedAt`, `remindedAt` (T-118), `closedAt`, `raschN` (null bo'lsa taxminiy ball, BR-M05). Belgi bir marta, shartli `updateMany` bilan qo'yiladi.
- `ExamTemplate` bo'limlari va darajalari JSON'da; mock yaratilganda nusxa olinadi, shablon keyin o'zgarsa ham natija o'zgarmaydi (BR-M01).
- `WeeklyAttempt` va `MockAttempt` da `awayCount`, `awayMs` (T-193, BR-W11): test paytida ilovadan chiqish, faqat ustoz navbati va mock natijalarida o'qiladi.

## Guruhlar va davomat

```
Group (name, schedule, isActive) ← StudentProfile.groupId (bitta guruh, BR-G01)
Attendance (userId, groupId, date, status PRESENT|LATE|ABSENT|EXCUSED, note, markedBy, notifiedStatus): o'quvchi va kun bo'yicha bitta (BR-G02)
```

`notifiedStatus` ota-onaga yuborilgan holat: o'zgarsa "Tuzatish" xabari boradi (BR-G03).

## AI yordamchi

```
TutorChat (userId, mode PRACTICE|REVIEW|FREE, questionId, attemptId) → TutorMessage (role USER|ASSISTANT, text, provider)
```

`attemptId`: PRACTICE uchun `TopicAttempt.id`, REVIEW uchun `WeeklyAttempt.id`. Hamma suhbat saqlanadi (BR-T04).

## Fayllar

Rasmlar bazada emas, `MEDIA_DIR` da: `solutions/...` (yechim rasmlari), `receipts/...` (cheklar). Bazada nisbiy yo'l turadi. Rasmlar faqat ruxsat tekshirilgan endpoint orqali beriladi.

## Migratsiyalar

- Lokal: `pnpm db:migrate`. Production: API konteyneri ishga tushganda `prisma migrate deploy`.
- Qo'llangan migratsiya tahrirlanmaydi. Yangi ustun eski yozuvlar uchun to'g'ri qiymat bilan to'ldiriladi (masalan T-080 da ochilgan testlar `announcedAt` bilan belgilangan, aks holda eski testlar uchun xabar ketardi).
- CI sxema va migratsiyalar mosligini tekshiradi (Prisma drift).
