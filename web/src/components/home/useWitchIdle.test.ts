import {
  BLINK_DURATION,
  BLINK_STEPS,
  useWitchIdle,
} from "@/components/home/useWitchIdle";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ทดสอบจังหวะด้วยนาฬิกาจำลอง และกำหนดค่าสุ่มเอง:
 * ค่าสุ่ม 0.5 → รอ 2000ms ระหว่างกะพริบ
 * หนึ่งครั้ง: ครึ่ง 50ms → หลับ 100ms → ครึ่ง 70ms → ลืม (รวม 320ms)
 */
function setup(enabled = true) {
  return renderHook(({ on }) => useWitchIdle(on).frame, {
    initialProps: { on: enabled },
  });
}

/** เลื่อนไปที่เวลา t (นับจากตอนเริ่ม) */
let now = 0;
const at = (t: number) => {
  act(() => vi.advanceTimersByTime(t - now));
  now = t;
};

describe("useWitchIdle (blink only)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    now = 0;
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("stays on the front between blinks", () => {
    const { result } = setup();
    at(1999);
    expect(result.current).toBe("front");
  });

  it("closes fast, holds closed, opens slower (like a real blink)", () => {
    const { result } = setup();

    at(2000);
    expect(result.current).toBe("front-blink-half");
    at(2049);
    expect(result.current).toBe("front-blink-half");
    at(2050);
    expect(result.current).toBe("front-blink-closed");
    at(2149);
    expect(result.current).toBe("front-blink-closed");
    at(2150);
    expect(result.current).toBe("front-blink-half");
    at(2220);
    expect(result.current).toBe("front");
  });

  it("every step holds longer than its fade, so each frame shows fully", () => {
    for (const step of BLINK_STEPS) {
      expect(step.hold).toBeGreaterThanOrEqual(step.fade);
    }
    expect(BLINK_DURATION).toBe(320);
  });

  it("returns the fade for the current step (quick close, slower open)", () => {
    const { result } = renderHook(() => useWitchIdle(true));
    expect(result.current.fadeMs).toBe(100);
    at(2000);
    expect(result.current.fadeMs).toBe(40);
    at(2150);
    expect(result.current.fadeMs).toBe(60);
    at(2220);
    expect(result.current.fadeMs).toBe(100);
  });

  it("blinks again after another 1.5-2.5s", () => {
    const { result } = setup();

    // ครั้งแรกจบ 2320 + รอ 2000 = 4320
    at(4319);
    expect(result.current).toBe("front");
    at(4320);
    expect(result.current).toBe("front-blink-half");
  });

  it("only ever uses the blink frames (no smile, no other faces)", () => {
    const { result } = setup();
    const seen = new Set<string>();
    for (let t = 0; t <= 30_000; t += 10) {
      at(t);
      seen.add(result.current);
    }
    expect([...seen].sort()).toEqual([
      "front",
      "front-blink-closed",
      "front-blink-half",
    ]);
  });

  it("pauses on hover (shows front, clears every timer) and starts over after", () => {
    const { result, rerender } = setup();
    at(2050);
    expect(result.current).toBe("front-blink-closed");

    rerender({ on: false });
    expect(result.current).toBe("front");
    expect(vi.getTimerCount()).toBe(0);

    rerender({ on: true });
    expect(result.current).toBe("front");
    at(2050 + 2000);
    expect(result.current).toBe("front-blink-half");
  });

  it("cleans up every timer on unmount", () => {
    const { unmount } = setup();
    at(1000);
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
