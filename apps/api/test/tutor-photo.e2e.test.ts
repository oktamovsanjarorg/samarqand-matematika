import type { AdminTutorChat, TutorChatView } from "@samarqand/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PHOTO_ONLY_TEXT } from "../src/tutor/tutor-context";
import { testAi } from "./helpers";
import { weeklyFixture } from "./weekly-fixture";

let f: Awaited<ReturnType<typeof weeklyFixture>>;
beforeAll(async () => {
  f = await weeklyFixture();
});
afterAll(() => f.cleanup());
beforeEach(() => {
  testAi.tutorCalls.length = 0;
  testAi.reply = () => "Avval shartni yozib ol";
});

const PNG = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(32)]);
const upload = (h: Record<string, string>, chatId: string, body = PNG, type = "image/png") =>
  f.app.inject({
    method: "POST",
    url: `/api/tutor/chats/${chatId}/photos`,
    headers: { ...h, "content-type": type },
    payload: body,
  });
const freeChat = async (h: Record<string, string>) =>
  (await f.call("POST", "/tutor/chats", h, { mode: "FREE" })).json() as TutorChatView;
const say = (h: Record<string, string>, id: string, body: object) =>
  f.call("POST", `/tutor/chats/${id}/messages`, h, body);

describe("Yordamchiga rasm (T-170)", () => {
  it("BR-T06: rasm yuklanadi, xabar bilan AI'ga boradi; matnsiz ham bo'ladi; ustoz ko'radi, boshqasi yo'q", async () => {
    const s = await f.student();
    const chat = await freeChat(s.headers);
    const up = await upload(s.headers, chat.id);
    expect(up.statusCode).toBe(201);
    const photoId = (up.json() as { id: string }).id;

    const r = await say(s.headers, chat.id, { photoId });
    expect(r.statusCode).toBe(200);
    const v = r.json() as TutorChatView;
    expect(v.messages.map((m) => [m.role, m.text, m.photoId])).toEqual([
      ["USER", "", photoId],
      ["ASSISTANT", "Avval shartni yozib ol", null],
    ]);
    const call = testAi.tutorCalls[0];
    expect(call?.photos).toHaveLength(1);
    expect(call?.photos[0]?.type).toBe("image/png");
    expect(call?.history.at(-1)?.text).toBe(PHOTO_ONLY_TEXT);
    // Ochiq test bo'lmasa ham himoya matni faqat rasm bilan qo'shiladi
    await say(s.headers, chat.id, { text: "Rahmat" });
    expect(testAi.tutorCalls[1]?.photos).toEqual([]);
    expect(testAi.tutorCalls[1]?.context).not.toContain("Hozir ochiq test savollari");

    // Yuborilgan rasm qayta ishlatilmaydi
    expect((await say(s.headers, chat.id, { photoId })).statusCode).toBe(404);

    const own = await f.call("GET", `/tutor/photos/${photoId}`, s.headers);
    expect(own.statusCode).toBe(200);
    expect(own.headers["content-type"]).toBe("image/png");
    const other = await f.student();
    expect((await f.call("GET", `/tutor/photos/${photoId}`, other.headers)).statusCode).toBe(404);
    expect((await upload(other.headers, chat.id)).statusCode).toBe(404);
    expect((await f.call("GET", `/admin/tutor/photos/${photoId}`, f.teacher)).statusCode).toBe(200);
    expect((await f.call("GET", `/admin/tutor/photos/${photoId}`, s.headers)).statusCode).toBe(403);
    const full = (await f.call("GET", `/admin/tutor/chats/${chat.id}`, f.teacher)).json() as AdminTutorChat;
    expect(full.messages[0]?.photoId).toBe(photoId);
  });

  it("yuklash: rasm bo'lmasa 400; yuborilmagan rasm yangisi bilan almashadi; bo'sh xabar 400", async () => {
    const s = await f.student();
    const chat = await freeChat(s.headers);
    expect((await upload(s.headers, chat.id, Buffer.from("salom dunyo, bu rasm emas"))).statusCode).toBe(400);
    const a = (await upload(s.headers, chat.id)).json() as { id: string };
    const b = (await upload(s.headers, chat.id)).json() as { id: string };
    expect(await f.prisma.tutorPhoto.count({ where: { chatId: chat.id } })).toBe(1);
    expect((await say(s.headers, chat.id, { photoId: a.id })).statusCode).toBe(404);
    expect((await say(s.headers, chat.id, { text: " " })).statusCode).toBe(400);
    expect((await say(s.headers, chat.id, { photoId: "x" })).statusCode).toBe(400);
    expect((await say(s.headers, chat.id, { text: "Shu", photoId: b.id })).statusCode).toBe(200);
    expect(testAi.tutorCalls[0]?.history.at(-1)?.text).toBe("Shu");
  });

  it("BR-T06: ochiq test savollari modelga beriladi; model OCHIQ_TEST desa rad etiladi, xabar saqlanmaydi", async () => {
    const qids = await f.questions();
    await f.weekly(qids);
    const s = await f.student();
    const chat = await freeChat(s.headers);
    const { id } = (await upload(s.headers, chat.id)).json() as { id: string };
    testAi.reply = () => "OCHIQ_TEST";
    const r = await say(s.headers, chat.id, { photoId: id });
    expect(r.statusCode).toBe(403);
    expect(r.json()).toMatchObject({ code: "AI_BLOCKED" });
    expect(testAi.tutorCalls[0]?.context).toContain("Hozir ochiq test savollari");
    expect(testAi.tutorCalls[0]?.context).toContain("1+1?");
    expect((await f.call("GET", `/tutor/chats/${chat.id}`, s.headers)).json().messages).toEqual([]);
    // Rasm yuborilmay qoldi: boshqa savol bilan qayta yuborsa bo'ladi
    testAi.reply = () => "Bu boshqa masala";
    expect((await say(s.headers, chat.id, { photoId: id })).statusCode).toBe(200);
    // Rasmsiz xabarda ochiq test savollari modelga berilmaydi
    await say(s.headers, chat.id, { text: "Tushundim" });
    expect(testAi.tutorCalls.at(-1)?.context).not.toContain("Hozir ochiq test savollari");
  });
});
