import {
  formatBaht,
  formatClock,
  formatCount,
  formatDate,
  formatEnum,
  formatMonth,
  formatPrice,
  fullName,
  greeting,
} from "@/lib/format";
import { formatDuration } from "@/lib/utils";
import { describe, expect, it } from "vitest";

describe("formatPrice / formatBaht", () => {
  it("shows free courses as Free", () => {
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice("0.00")).toBe("Free");
  });

  it("shows paid amounts in baht with separators", () => {
    expect(formatPrice("2500.00")).toBe("฿2,500");
  });

  it("keeps ฿0 for totals (not Free)", () => {
    expect(formatBaht(0)).toBe("฿0");
  });
});

describe("formatClock", () => {
  it.each([
    [41, "0:41"],
    [65, "1:05"],
    [3725, "1:02:05"],
  ])("%i seconds → %s", (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });
});

describe("formatDuration", () => {
  it.each([
    [41, "1m"],
    [1800, "30m"],
    [5400, "1h 30m"],
  ])("%i seconds → %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe("formatEnum", () => {
  it("turns API enums into readable words", () => {
    expect(formatEnum("SUPER_ADMIN")).toBe("Super admin");
    expect(formatEnum("MOBILE_BANKING")).toBe("Mobile banking");
  });
});

describe("formatDate", () => {
  it("formats as day month year", () => {
    expect(formatDate("2026-03-05T10:00:00.000Z")).toBe("5 Mar 2026");
  });

  it("shows a dash when there is no date", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate(undefined)).toBe("-");
  });
});

describe("formatCount", () => {
  it("uses the singular for exactly one", () => {
    expect(formatCount(1, "course")).toBe("1 course");
  });

  it("uses the plural with separators otherwise", () => {
    expect(formatCount(0, "lesson")).toBe("0 lessons");
    expect(formatCount(1200, "student")).toBe("1,200 students");
  });
});

describe("formatMonth", () => {
  it("shows month and year only", () => {
    expect(formatMonth("2026-09-15T00:00:00Z")).toBe("Sept 2026");
  });
});

describe("greeting (Bangkok time)", () => {
  it.each([
    ["2026-01-01T01:00:00Z", "Good morning"], // 08:00 ICT
    ["2026-01-01T06:00:00Z", "Good afternoon"], // 13:00 ICT
    ["2026-01-01T12:00:00Z", "Good evening"], // 19:00 ICT
  ])("%s → %s", (iso, expected) => {
    expect(greeting(new Date(iso))).toBe(expected);
  });
});

describe("fullName", () => {
  it("joins first and last name", () => {
    expect(fullName({ firstName: "Ada", lastName: "Lovelace" })).toBe(
      "Ada Lovelace",
    );
  });
});
