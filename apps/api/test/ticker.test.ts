import { Logger } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Ticker } from "../src/common/ticker";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

describe("Ticker (T-136)", () => {
  it("oldingi tick tugamaguncha yangisi boshlanmaydi", async () => {
    const d = deferred();
    const tick = vi.fn(() => d.promise);
    const t = new Ticker(new Logger("test"));
    t.start(1, tick);
    await vi.advanceTimersByTimeAsync(3500);
    expect(tick).toHaveBeenCalledTimes(1);
    d.resolve();
    await vi.advanceTimersByTimeAsync(1000);
    expect(tick).toHaveBeenCalledTimes(2);
    await t.stop();
  });

  it("stop boshlangan tick tugashini kutadi va yangisini boshlamaydi", async () => {
    const d = deferred();
    const tick = vi.fn(() => d.promise);
    const t = new Ticker(new Logger("test"));
    t.start(1, tick);
    await vi.advanceTimersByTimeAsync(1000);
    let stopped = false;
    const stop = t.stop().then(() => (stopped = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(stopped).toBe(false);
    d.resolve();
    await stop;
    expect(stopped).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it("tick xatosi keyingi tick'larni to'xtatmaydi; 0 soniya: o'chiq", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const tick = vi.fn(() => Promise.reject(new TypeError("x")));
    const t = new Ticker(new Logger("test"));
    t.start(1, tick);
    await vi.advanceTimersByTimeAsync(2000);
    expect(tick).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith("tick: TypeError");
    await t.stop();

    const off = vi.fn(() => Promise.resolve());
    new Ticker(new Logger("test")).start(0, off);
    await vi.advanceTimersByTimeAsync(5000);
    expect(off).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
