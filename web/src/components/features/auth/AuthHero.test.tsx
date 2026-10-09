import AuthHero from "@/components/features/auth/AuthHero";
import { AuthRoleProvider } from "@/components/features/auth/AuthRole";
import SignupForm from "@/components/features/auth/SignupForm";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// หน้าไหนอยู่ ตัดสินว่าแสดงตัวละครตาม role (หน้าสมัคร) หรือแม่มดทักทาย (หน้าอื่น)
const { pathname } = vi.hoisted(() => ({ pathname: { current: "/signup" } }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

vi.mock("@/lib/actions/auth.action", () => ({
  registerAction: vi.fn(),
  loginWithGoogleAction: vi.fn(),
}));

/** รูปตัวละครที่กำลังแสดง (อีกรูปซ่อนด้วย opacity-0) */
const shownCharacter = () =>
  screen
    .getAllByRole("img", { hidden: true })
    .find((img) => img.className.includes("opacity-100"))
    ?.getAttribute("src");

function SignupPage({ asInstructor = false }: { asInstructor?: boolean }) {
  return (
    <AuthRoleProvider>
      <AuthHero />
      <SignupForm initialAsInstructor={asInstructor} />
    </AuthRoleProvider>
  );
}

describe("Sign up: character follows the selected role", () => {
  beforeEach(() => {
    pathname.current = "/signup";
  });

  it("starts as a student", () => {
    render(<SignupPage />);

    expect(shownCharacter()).toBe("/witch/role-student.webp");
    expect(
      screen.getByRole("heading", {
        name: "Learn new skills, at your own pace",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Register as Student" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("switches to the instructor character and copy when that role is picked", async () => {
    const user = userEvent.setup();
    render(<SignupPage />);

    await user.click(
      screen.getByRole("button", { name: "Register as Instructor" }),
    );

    expect(shownCharacter()).toBe("/witch/role-instructor.webp");
    expect(
      screen.getByRole("heading", {
        name: "Share your knowledge, inspire learners",
      }),
    ).toBeInTheDocument();
  });

  it("opens on the instructor character from ?role=INSTRUCTOR", () => {
    render(<SignupPage asInstructor />);
    expect(shownCharacter()).toBe("/witch/role-instructor.webp");
  });

  it("goes back to the student character after leaving the sign-up form", async () => {
    const user = userEvent.setup();

    // หน้าอื่นใน (auth) เช่น Log in ใช้ layout เดียวกัน ไม่มีฟอร์มสมัคร
    function AuthPages() {
      const [onSignup, setOnSignup] = useState(true);
      return (
        <AuthRoleProvider>
          <AuthHero />
          <button type="button" onClick={() => setOnSignup(false)}>
            Go to log in
          </button>
          {onSignup && <SignupForm initialAsInstructor />}
        </AuthRoleProvider>
      );
    }

    render(<AuthPages />);
    expect(shownCharacter()).toBe("/witch/role-instructor.webp");

    await user.click(screen.getByRole("button", { name: "Go to log in" }));
    expect(shownCharacter()).toBe("/witch/role-student.webp");
  });
});

describe("Log in and other auth pages: waving witch", () => {
  it("shows the hello witch and a welcome-back message instead of a role", () => {
    pathname.current = "/login";
    render(
      <AuthRoleProvider>
        <AuthHero />
      </AuthRoleProvider>,
    );

    expect(
      screen.getByRole("img", { name: "Learnora's witch waving hello" }),
    ).toHaveAttribute("src", "/witch/login-hello-cutout.webp");
    expect(
      screen.getByRole("heading", { name: "Welcome back!" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Learn new skills/)).not.toBeInTheDocument();
  });

  it("floats gently (the CSS animation is switched off for reduced motion)", () => {
    pathname.current = "/login";
    render(
      <AuthRoleProvider>
        <AuthHero />
      </AuthRoleProvider>,
    );

    const witch = screen.getByRole("img", {
      name: "Learnora's witch waving hello",
    });
    expect(witch.closest(".animate-witch-float")).not.toBeNull();
  });
});

describe("Sign up: terms agreement", () => {
  beforeEach(() => {
    pathname.current = "/signup";
  });

  it("explains under the Google button that continuing means agreeing", () => {
    render(<SignupPage />);

    const google = screen.getByRole("button", { name: "Sign up with Google" });
    expect(google).toBeEnabled();
    expect(google.closest("form")).toHaveTextContent(
      "By continuing with Google, you agree to our Terms of Service and Privacy Policy.",
    );
  });

  it("puts the agreement checkbox right above Create Account", () => {
    render(<SignupPage />);

    const checkbox = screen.getByRole("checkbox");
    const submit = screen.getByRole("button", { name: "Create Account" });
    expect(checkbox.compareDocumentPosition(submit)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(
      screen
        .getByRole("textbox", { name: /Email address/ })
        .compareDocumentPosition(checkbox),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("links to the Terms and Privacy Policy in a new tab from the checkbox", () => {
    render(<SignupPage />);

    const label = screen.getByRole("checkbox").closest("label")!;
    for (const [name, href] of [
      ["Terms of Service", "/terms"],
      ["Privacy Policy", "/privacy"],
    ]) {
      const link = within(label).getByRole("link", { name });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
    }
  });
});
