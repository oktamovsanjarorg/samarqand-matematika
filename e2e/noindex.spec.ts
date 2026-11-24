import { expect, test } from "@playwright/test";

const MINIAPP = "http://127.0.0.1:5190";
const ADMIN = "http://127.0.0.1:5191/admin/";

test("T-178: ilova va admin qidiruvga tushmaydi; robots.txt noindex'ni o'qishga to'sqinlik qilmaydi", async ({
  request,
}) => {
  for (const url of [`${MINIAPP}/`, ADMIN]) {
    const html = await (await request.get(url)).text();
    expect(html, url).toContain('<meta name="robots" content="noindex, nofollow" />');
  }
  const robots = await (await request.get(`${MINIAPP}/robots.txt`)).text();
  expect(robots).toContain("Disallow: /api/");
  expect(robots).not.toMatch(/^Disallow: \/(admin.*)?$/m);
});
