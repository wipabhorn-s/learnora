import DeleteAccountCard from "@/components/features/security/DeleteAccountCard";
import type { SecurityOverview } from "@/lib/api/api.type";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteAccountAction, requestDeleteCodeAction, toast } = vi.hoisted(
  () => ({
    deleteAccountAction: vi.fn(),
    requestDeleteCodeAction: vi.fn(),
    toast: { result: vi.fn(), success: vi.fn(), error: vi.fn() },
  }),
);

vi.mock("@/lib/actions/security.action", () => ({
  deleteAccountAction,
  requestDeleteCodeAction,
}));
vi.mock("@/lib/toast", () => ({ toast }));

const baseSecurity: SecurityOverview = {
  email: "ann@test.local",
  emailVerified: true,
  hasPassword: true,
  googleConnected: false,
  isInstructor: false,
  twoFactorEnabled: false,
  pendingEmail: null,
};

async function openDialog(security: Partial<SecurityOverview> = {}) {
  const user = userEvent.setup();
  render(<DeleteAccountCard security={{ ...baseSecurity, ...security }} />);
  await user.click(screen.getByRole("button", { name: "Delete my account" }));
  return user;
}

describe("DeleteAccountCard — account with a password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for the password, not an email code", async () => {
    await openDialog();

    expect(
      screen.getByLabelText("Enter your password to confirm"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send code" }),
    ).not.toBeInTheDocument();
  });

  it("requires the password before calling the API", async () => {
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "Delete account" }));

    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(deleteAccountAction).not.toHaveBeenCalled();
  });

  it("sends the password and shows the error if it is wrong", async () => {
    deleteAccountAction.mockResolvedValue({
      success: false,
      message: "Password is incorrect",
      code: "HTTP_401",
    });
    const user = await openDialog();

    await user.type(
      screen.getByLabelText("Enter your password to confirm"),
      "Wrong1!",
    );
    await user.click(screen.getByRole("button", { name: "Delete account" }));

    await waitFor(() =>
      expect(deleteAccountAction).toHaveBeenCalledWith({ password: "Wrong1!" }),
    );
    expect(
      await screen.findByText("Password is incorrect"),
    ).toBeInTheDocument();
  });
});

describe("DeleteAccountCard — account without a password (Google)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("first asks for the email, then the 6-digit code", async () => {
    requestDeleteCodeAction.mockResolvedValue({
      success: true,
      message: "We sent a 6-digit code to ann@test.local",
      challengeId: "challenge-1",
    });
    const user = await openDialog({
      hasPassword: false,
      googleConnected: true,
    });

    // ขั้นที่ 1: พิมพ์อีเมล ยังไม่มีปุ่มลบ
    expect(
      screen.queryByRole("button", { name: "Delete account" }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/account email/), "ann@test.local");
    await user.click(screen.getByRole("button", { name: "Send code" }));

    await waitFor(() =>
      expect(requestDeleteCodeAction).toHaveBeenCalledWith("ann@test.local"),
    );
    expect(toast.success).toHaveBeenCalled();

    // ขั้นที่ 2: กรอกรหัส ปุ่มลบกดได้เมื่อครบ 6 หลัก
    expect(
      await screen.findByText("Enter the code we sent to ann@test.local"),
    ).toBeInTheDocument();
    const deleteButton = screen.getByRole("button", { name: "Delete account" });
    expect(deleteButton).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Resend code in/ }),
    ).toBeDisabled();
  });

  it("deletes with the challenge and code", async () => {
    requestDeleteCodeAction.mockResolvedValue({
      success: true,
      message: "Sent",
      challengeId: "challenge-1",
    });
    deleteAccountAction.mockResolvedValue(undefined); // สำเร็จ = redirect
    const user = await openDialog({ hasPassword: false });

    await user.type(screen.getByLabelText(/account email/), "ann@test.local");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByText("Enter the code we sent to ann@test.local");

    await user.type(
      screen.getByLabelText("Enter the code we sent to ann@test.local"),
      "123456",
    );
    await user.click(screen.getByRole("button", { name: "Delete account" }));

    await waitFor(() =>
      expect(deleteAccountAction).toHaveBeenCalledWith({
        challengeId: "challenge-1",
        code: "123456",
      }),
    );
  });

  it("shows why the code could not be sent", async () => {
    requestDeleteCodeAction.mockResolvedValue({
      success: false,
      message: "That isn't the email address on your account",
      code: "HTTP_400",
    });
    const user = await openDialog({ hasPassword: false });

    await user.type(screen.getByLabelText(/account email/), "other@test.local");
    await user.click(screen.getByRole("button", { name: "Send code" }));

    expect(
      await screen.findByText("That isn't the email address on your account"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send code" }),
    ).toBeInTheDocument();
  });
});
