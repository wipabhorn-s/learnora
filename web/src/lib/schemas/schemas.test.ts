import { loginSchema, signupSchema } from "@/lib/schemas/auth.schema";
import { createCourseSchema } from "@/lib/schemas/course.schema";
import {
  PASSWORD_CHARSET_RULE,
  PASSWORD_RULES,
  passwordSchema,
} from "@/lib/schemas/password.schema";
import { payoutAccountSchema } from "@/lib/schemas/payout.schema";
import { describe, expect, it } from "vitest";

const firstError = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => result.error?.issues[0]?.message;

describe("passwordSchema (must match @StrongPassword on the API)", () => {
  it("accepts a strong password", () => {
    expect(passwordSchema.safeParse("Learnora1!").success).toBe(true);
  });

  it.each([
    ["Ab1!", "at least 8"],
    ["learnora1!", "uppercase"],
    ["LEARNORA1!", "lowercase"],
    ["Learnora!!", "number"],
    ["Learnora11", "special"],
    ["Learn ora1!", "no spaces"],
    ["รหัสผ่านAa1!", "no spaces"],
  ])("rejects %s (%s)", (password, reason) => {
    expect(firstError(passwordSchema.safeParse(password))).toContain(reason);
  });

  it("rejects passwords longer than bcrypt can read (72 characters)", () => {
    const tooLong = `Aa1!${"x".repeat(69)}`;
    expect(tooLong).toHaveLength(73);
    expect(passwordSchema.safeParse(tooLong).success).toBe(false);
  });

  it("checklist rules agree with the schema", () => {
    const password = "Learnora1!";
    expect(PASSWORD_RULES.every((rule) => rule.test(password))).toBe(true);
    expect(PASSWORD_CHARSET_RULE.test(password)).toBe(true);
    expect(PASSWORD_CHARSET_RULE.test("has space1A!")).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = {
    firstName: "Ann",
    lastName: "Lee",
    email: "ann@test.local",
    password: "Learnora1!",
    confirmPassword: "Learnora1!",
    isInstructor: false,
    acceptTerms: true,
  };

  it("accepts a valid sign-up", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("requires accepting the Terms and Privacy Policy", () => {
    expect(
      firstError(signupSchema.safeParse({ ...valid, acceptTerms: false })),
    ).toBe("Please accept the Terms of Service and Privacy Policy");
  });

  it("points the mismatch error at the confirm field", () => {
    const result = signupSchema.safeParse({
      ...valid,
      confirmPassword: "Different1!",
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ["confirmPassword"],
      message: "Passwords do not match",
    });
  });

  it("requires a real email", () => {
    expect(
      firstError(signupSchema.safeParse({ ...valid, email: "not-an-email" })),
    ).toBe("Invalid email address");
  });
});

describe("loginSchema", () => {
  it("does not apply the strong-password rules (old passwords still log in)", () => {
    expect(
      loginSchema.safeParse({ email: "ann@test.local", password: "old" })
        .success,
    ).toBe(true);
  });
});

describe("createCourseSchema", () => {
  const valid = {
    title: "Python Programming Fundamentals",
    subtitle: "",
    description: "Learn Python from scratch.",
    learningOutcomes: ["Write Python scripts"],
    requirements: [],
    price: 990,
    category: "PROGRAMMING" as const,
    level: "BEGINNER" as const,
    accessType: "LIFETIME" as const,
  };

  it("accepts a lifetime course with an empty subtitle", () => {
    expect(createCourseSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a duration for limited-access courses", () => {
    const result = createCourseSchema.safeParse({
      ...valid,
      accessType: "LIMITED",
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ["accessDuration"],
      message: "Duration is required for limited access",
    });
  });

  it("rejects a subtitle over 160 characters", () => {
    expect(
      createCourseSchema.safeParse({ ...valid, subtitle: "x".repeat(161) })
        .success,
    ).toBe(false);
  });

  it("rejects list items over 160 characters", () => {
    expect(
      createCourseSchema.safeParse({
        ...valid,
        learningOutcomes: ["x".repeat(161)],
      }).success,
    ).toBe(false);
  });

  it("rejects negative prices", () => {
    expect(
      firstError(createCourseSchema.safeParse({ ...valid, price: -1 })),
    ).toBe("Price cannot be negative");
  });
});

describe("payoutAccountSchema", () => {
  const valid = {
    bankCode: "kbank",
    accountName: "Ann Teacher",
    accountNumber: "123-4-56789-0",
  };

  it("strips dashes and spaces from the account number", () => {
    const result = payoutAccountSchema.safeParse(valid);
    expect(result.success && result.data.accountNumber).toBe("1234567890");
  });

  it.each(["12345", "12a4567890", "1".repeat(21)])(
    "rejects account number %s",
    (accountNumber) => {
      expect(
        firstError(payoutAccountSchema.safeParse({ ...valid, accountNumber })),
      ).toBe("Account number must be 6-20 digits");
    },
  );

  it.each([undefined, "", "Kasikornbank", "xyz"])(
    "requires a bank from the Opn list (got %s)",
    (bankCode) => {
      expect(
        firstError(payoutAccountSchema.safeParse({ ...valid, bankCode })),
      ).toBe("Select your bank");
    },
  );

  it("requires an account holder", () => {
    expect(
      firstError(payoutAccountSchema.safeParse({ ...valid, accountName: "" })),
    ).toBe("Account holder name is required");
  });
});
