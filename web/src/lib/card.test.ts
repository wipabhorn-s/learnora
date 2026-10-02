import {
  cardLengths,
  formatCardNumber,
  formatExpiry,
  passesLuhn,
} from "@/lib/card";
import { describe, expect, it } from "vitest";

describe("formatCardNumber", () => {
  it("groups Visa/Mastercard numbers in fours", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
  });

  it("stops at 16 digits for Visa", () => {
    expect(formatCardNumber("4242424242424242999")).toBe("4242 4242 4242 4242");
  });

  it("groups American Express as 4-6-5 and stops at 15 digits", () => {
    expect(formatCardNumber("3782822463100059")).toBe("3782 822463 10005");
  });

  it("allows UnionPay up to 19 digits", () => {
    expect(
      formatCardNumber("62000000000000000004").replace(/\s/g, ""),
    ).toHaveLength(19);
  });

  it("ignores anything that is not a digit", () => {
    expect(formatCardNumber("4242-4242 abc 4242")).toBe("4242 4242 4242");
  });
});

describe("cardLengths", () => {
  it.each([
    ["4242", [16]],
    ["5555", [16]],
    ["3782", [15]],
    ["3412", [15]],
    ["6200", [16, 17, 18, 19]],
  ])("%s… allows %j digits", (prefix, lengths) => {
    expect(cardLengths(prefix)).toEqual(lengths);
  });
});

describe("passesLuhn", () => {
  it.each(["4242424242424242", "378282246310005", "5555555555554444"])(
    "accepts the valid test card %s",
    (number) => {
      expect(passesLuhn(number)).toBe(true);
    },
  );

  it("rejects a mistyped last digit", () => {
    expect(passesLuhn("4242424242424241")).toBe(false);
  });

  it("rejects two swapped digits", () => {
    expect(passesLuhn("4242424242424224")).toBe(false);
  });
});

describe("formatExpiry", () => {
  it("adds the slash after the month", () => {
    expect(formatExpiry("1230")).toBe("12/30");
  });

  it("leaves partial input alone", () => {
    expect(formatExpiry("1")).toBe("1");
    expect(formatExpiry("12")).toBe("12");
  });

  it("keeps at most 4 digits", () => {
    expect(formatExpiry("12/3099")).toBe("12/30");
  });
});
