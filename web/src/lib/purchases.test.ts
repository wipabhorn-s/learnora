import {
  getOwnedCourseIds,
  type PurchaseResponse,
} from "@/lib/api/purchase.api";
import { LOGIN_ERRORS, loginErrorMessage } from "@/lib/login-errors";
import { canRequestRefund } from "@/lib/refund";
import { describe, expect, it } from "vitest";

type Item = PurchaseResponse["purchaseItems"][number];

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    price: "490.00",
    expiresAt: null,
    enrollmentStatus: "ACTIVE",
    course: {
      id: 1,
      title: "Python",
      thumbnailUrl: null,
      instructor: { firstName: "W", lastName: "S" },
    },
    refundRequest: null,
    ...overrides,
  };
}

function purchase(overrides: Partial<PurchaseResponse> = {}): PurchaseResponse {
  return {
    id: "purchase-1",
    total: "990.00",
    refundedAmount: "0.00",
    paymentStatus: "SUCCESS",
    purchasedAt: "2026-10-01T00:00:00.000Z",
    createdAt: "2026-10-01T00:00:00.000Z",
    purchaseItems: [item()],
    refundDeadline: "2026-10-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("getOwnedCourseIds", () => {
  it("counts courses from successful purchases", () => {
    expect(getOwnedCourseIds([purchase()])).toEqual(new Set([1]));
  });

  it("ignores pending and failed purchases", () => {
    expect(
      getOwnedCourseIds([
        purchase({ paymentStatus: "PENDING" }),
        purchase({ paymentStatus: "FAILED" }),
      ]).size,
    ).toBe(0);
  });

  it("ignores a course refunded on its own (order still SUCCESS)", () => {
    const refunded = item({ id: "item-2", enrollmentStatus: "REFUNDED" });
    refunded.course = { ...refunded.course, id: 2 };
    expect(
      getOwnedCourseIds([purchase({ purchaseItems: [item(), refunded] })]),
    ).toEqual(new Set([1]));
  });

  it("ignores expired limited-access courses", () => {
    expect(
      getOwnedCourseIds([
        purchase({ purchaseItems: [item({ enrollmentStatus: "EXPIRED" })] }),
      ]).size,
    ).toBe(0);
  });
});

describe("canRequestRefund", () => {
  it("allows an active paid course within the refund window", () => {
    const order = purchase();
    expect(canRequestRefund(order, order.purchaseItems[0])).toBe(true);
  });

  it("hides the button once the window has closed (API sends null)", () => {
    const order = purchase({ refundDeadline: null });
    expect(canRequestRefund(order, order.purchaseItems[0])).toBe(false);
  });

  it("hides it for free courses", () => {
    const order = purchase();
    expect(canRequestRefund(order, item({ price: "0.00" }))).toBe(false);
  });

  it("hides it when this course was already requested", () => {
    const order = purchase();
    const requested = item({
      refundRequest: {
        status: "REJECTED",
        adminNote: "No",
        createdAt: "2026-10-02T00:00:00.000Z",
        reviewedAt: "2026-10-03T00:00:00.000Z",
      },
    });
    expect(canRequestRefund(order, requested)).toBe(false);
  });

  it("hides it for a course that is already refunded", () => {
    const order = purchase();
    expect(
      canRequestRefund(order, item({ enrollmentStatus: "REFUNDED" })),
    ).toBe(false);
  });
});

describe("loginErrorMessage", () => {
  it("maps API codes to friendly messages", () => {
    expect(loginErrorMessage("EMAIL_NOT_VERIFIED")).toContain(
      "verify your email",
    );
    expect(loginErrorMessage("ACCOUNT_SUSPENDED")).toContain("suspended");
  });

  it("shows how many code attempts are left", () => {
    expect(loginErrorMessage("OTP_INVALID:3")).toBe(
      "Incorrect code. 3 attempts left.",
    );
    expect(loginErrorMessage("OTP_INVALID:1")).toBe(
      "Incorrect code. 1 attempt left.",
    );
  });

  it("shows how long a locked account must wait", () => {
    expect(loginErrorMessage("TOO_MANY_ATTEMPTS:12")).toContain(
      "Try again in 12 minutes",
    );
    expect(loginErrorMessage("TOO_MANY_ATTEMPTS:1")).toContain("in 1 minute,");
  });

  it("falls back to the generic message for unknown codes", () => {
    expect(loginErrorMessage("SOMETHING_NEW")).toBe(
      LOGIN_ERRORS.INVALID_CREDENTIALS,
    );
  });

  it("hints at Google sign-in without saying the account exists", () => {
    expect(loginErrorMessage("INVALID_CREDENTIALS")).toContain(
      "Continue with Google",
    );
  });
});
