import AuthHero from "@/components/features/auth/AuthHero";
import { AuthRoleProvider } from "@/components/features/auth/AuthRole";
import SignupForm from "@/components/features/auth/SignupForm";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

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
  it("starts as a student", () => {
    render(<SignupPage />);

    expect(shownCharacter()).toBe("/witch/role-student.png");
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

    expect(shownCharacter()).toBe("/witch/role-instructor.png");
    expect(
      screen.getByRole("heading", {
        name: "Share your knowledge, inspire learners",
      }),
    ).toBeInTheDocument();
  });

  it("opens on the instructor character from ?role=INSTRUCTOR", () => {
    render(<SignupPage asInstructor />);
    expect(shownCharacter()).toBe("/witch/role-instructor.png");
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
    expect(shownCharacter()).toBe("/witch/role-instructor.png");

    await user.click(screen.getByRole("button", { name: "Go to log in" }));
    expect(shownCharacter()).toBe("/witch/role-student.png");
  });
});
