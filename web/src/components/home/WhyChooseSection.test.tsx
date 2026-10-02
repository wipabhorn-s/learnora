import WhyChooseSection from "@/components/home/WhyChooseSection";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** รูปที่ซ้อนทับบน front.png (ฐานด้านล่างทึบตลอด) */
const overlays = () =>
  document
    .querySelectorAll<HTMLImageElement>("img:not([data-witch-base])")
    .values()
    .toArray();

/** รูปที่กำลังแสดง: รูปซ้อนชั้นบนสุด (มีได้ไม่เกินหนึ่ง) ถ้าไม่มี = เห็น front ที่เป็นฐาน */
function visibleWitch() {
  const shown = overlays().filter((img) =>
    img.hasAttribute("data-witch-current"),
  );
  expect(shown.length).toBeLessThanOrEqual(1);
  expect(shown[0]?.className ?? "opacity-100").toContain("opacity-100");
  return shown[0]?.getAttribute("src") ?? "/witch/front.png";
}

/** รูปซ้อนที่ทึบอยู่ทั้งหมด (รูปปัจจุบัน + รูปเก่าที่ค้างไว้ข้างใต้ระหว่างจาง) */
const opaque = () =>
  overlays()
    .filter((img) => img.className.includes("opacity-100"))
    .map((img) => img.getAttribute("src"));

/** การ์ดจากชื่อหัวข้อ (React ใช้ pointerover/out จำลอง pointerenter/leave) */
const card = (title: string) => screen.getByText(title).closest("[tabindex]")!;
const hover = (title: string, pointerType = "mouse") =>
  fireEvent.pointerOver(card(title), { pointerType });
const leave = (title: string, pointerType = "mouse") =>
  fireEvent.pointerOut(card(title), { pointerType });

/** ความเร็วการจางของรูปซ้อน (ทุกรูปใช้ค่าเดียวกัน) */
const fadeMs = () => overlays()[0].style.transitionDuration;

/** เลื่อนเวลาจำลอง */
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("WhyChooseSection witch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reveal ใช้ IntersectionObserver ซึ่ง jsdom ไม่มี
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    render(<WhyChooseSection />);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("preloads every frame (front + 2 blink + 6 directions) and starts at the front", () => {
    expect(document.querySelectorAll("img")).toHaveLength(9);
    expect(visibleWitch()).toBe("/witch/front.png");
  });

  it("keeps front.png fully opaque underneath at all times (no flicker)", () => {
    const base = document.querySelector("img[data-witch-base]")!;
    expect(base.getAttribute("src")).toBe("/witch/front.png");
    hover("Career Growth");
    expect(base.className).not.toContain("opacity-0");
    expect(base.className).not.toContain("transition");
  });

  it("has no icons in the cards (text only)", () => {
    expect(card("Career Growth").querySelector("svg.lucide")).toBeNull();
  });

  it.each([
    ["Verified Instructors", "upper-left"],
    ["Flexible Access Plans", "left"],
    ["Learn Anywhere", "lower-left"],
    ["Learn From Real Work", "upper-right"],
    ["Career Growth", "right"],
    ["Learn at Your Speed", "lower-right"],
  ])("looks toward %s (%s) right away", (title, pose) => {
    hover(title);
    expect(visibleWitch()).toBe(`/witch/${pose}.png`);
    expect(fadeMs()).toBe("150ms");
  });

  it("waits a moment after the mouse leaves, then fades back to the front slowly", () => {
    hover("Career Growth");
    leave("Career Growth");

    wait(599);
    expect(visibleWitch()).toBe("/witch/right.png");

    wait(1);
    expect(visibleWitch()).toBe("/witch/front.png");
    expect(fadeMs()).toBe("500ms");
  });

  it("switches straight to the next card without passing through the front", () => {
    hover("Verified Instructors");
    leave("Verified Instructors");
    wait(300);
    hover("Learn at Your Speed");
    expect(visibleWitch()).toBe("/witch/lower-right.png");
    expect(fadeMs()).toBe("150ms");

    // ตัวนับของใบแรกถูกยกเลิกแล้ว ครบเวลาก็ต้องไม่เด้งกลับหน้าตรง
    wait(1000);
    expect(visibleWitch()).toBe("/witch/lower-right.png");
  });

  it("card to card: keeps the old pose opaque underneath while the new one fades in (front never shows through)", () => {
    hover("Verified Instructors");
    wait(500);
    hover("Career Growth");

    // ระหว่างจาง: รูปใหม่อยู่บน รูปเก่ายังทึบอยู่ข้างใต้
    expect(visibleWitch()).toBe("/witch/right.png");
    expect(opaque().sort()).toEqual([
      "/witch/right.png",
      "/witch/upper-left.png",
    ]);

    // จางเสร็จ (150ms) ค่อยปล่อยรูปเก่า
    wait(150);
    expect(opaque()).toEqual(["/witch/right.png"]);
  });

  it("returning to the front lets the pose fade out (nothing kept underneath)", () => {
    hover("Career Growth");
    leave("Career Growth");
    wait(600);
    expect(opaque()).toEqual([]);
  });

  it("stays on a card for as long as it is hovered", () => {
    hover("Learn Anywhere");
    wait(10_000);
    expect(visibleWitch()).toBe("/witch/lower-left.png");
  });

  it("after returning to the front, the next card switch is fast again", () => {
    hover("Career Growth");
    leave("Career Growth");
    wait(600);
    hover("Learn Anywhere");
    expect(fadeMs()).toBe("150ms");
  });

  it("marks the card she is looking at, so sparkles show without :hover", () => {
    hover("Learn Anywhere");
    expect(card("Learn Anywhere")).toHaveAttribute("data-active", "true");
    expect(card("Career Growth")).toHaveAttribute("data-active", "false");
  });

  describe("on touch screens", () => {
    it("keeps looking at a tapped card after the finger lifts", () => {
      hover("Flexible Access Plans", "touch");
      fireEvent.click(card("Flexible Access Plans"));
      leave("Flexible Access Plans", "touch");
      wait(5000);
      expect(visibleWitch()).toBe("/witch/left.png");
    });

    it("tapping another card switches to it", () => {
      fireEvent.click(card("Flexible Access Plans"));
      fireEvent.click(card("Learn From Real Work"));
      expect(visibleWitch()).toBe("/witch/upper-right.png");
    });

    it("tapping outside the cards turns her back to the front smoothly", () => {
      fireEvent.click(card("Flexible Access Plans"));
      fireEvent.pointerDown(document.body, { pointerType: "touch" });
      wait(600);
      expect(visibleWitch()).toBe("/witch/front.png");
      expect(fadeMs()).toBe("500ms");
    });

    it("tapping inside a card does not reset her", () => {
      fireEvent.click(card("Flexible Access Plans"));
      fireEvent.pointerDown(screen.getByText("Flexible Access Plans"), {
        pointerType: "touch",
      });
      wait(5000);
      expect(visibleWitch()).toBe("/witch/left.png");
    });
  });

  it("works with the keyboard (focus / blur)", () => {
    fireEvent.focus(card("Learn From Real Work"));
    expect(visibleWitch()).toBe("/witch/upper-right.png");

    fireEvent.blur(card("Learn From Real Work"));
    wait(600);
    expect(visibleWitch()).toBe("/witch/front.png");
  });
});
