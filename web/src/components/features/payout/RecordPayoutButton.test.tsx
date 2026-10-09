import RecordPayoutButton from "@/components/features/payout/RecordPayoutButton";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordPayoutAction, toast } = vi.hoisted(() => ({
  recordPayoutAction: vi.fn(),
  toast: { result: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/actions/payout.action", () => ({ recordPayoutAction }));
vi.mock("@/lib/toast", () => ({ toast }));

async function openDialog() {
  const user = userEvent.setup();
  render(
    <RecordPayoutButton
      instructorId="instructor-1"
      instructorName="Ann Teacher"
      available="700.00"
      account={{
        bankCode: "kbank",
        bankName: "Kasikornbank",
        accountName: "Ann Teacher",
        accountNumber: "1234567890",
        updatedAt: "2026-10-01T00:00:00.000Z",
      }}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Pay out" }));
  return user;
}

describe("RecordPayoutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordPayoutAction.mockResolvedValue({
      success: true,
      message: "Payout recorded",
    });
  });

  it("shows where to transfer and pre-fills the full available amount", async () => {
    await openDialog();

    expect(screen.getByText(/Kasikornbank · 1234567890/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/)).toHaveValue(700);
  });

  it("requires a transfer reference", async () => {
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "Record payout" }));

    expect(
      screen.getByText("Enter the transfer reference"),
    ).toBeInTheDocument();
    expect(recordPayoutAction).not.toHaveBeenCalled();
  });

  it("blocks paying more than the available balance", async () => {
    const user = await openDialog();

    await user.clear(screen.getByLabelText(/Amount/));
    await user.type(screen.getByLabelText(/Amount/), "800");
    await user.type(screen.getByLabelText(/Transfer reference/), "TX-1");
    await user.click(screen.getByRole("button", { name: "Record payout" }));

    expect(
      screen.getByText("Enter an amount between ฿0.01 and ฿700"),
    ).toBeInTheDocument();
    expect(recordPayoutAction).not.toHaveBeenCalled();
  });

  it("records a partial payout with the reference", async () => {
    const user = await openDialog();

    await user.clear(screen.getByLabelText(/Amount/));
    await user.type(screen.getByLabelText(/Amount/), "250.50");
    await user.type(screen.getByLabelText(/Transfer reference/), "TX-123");
    await user.click(screen.getByRole("button", { name: "Record payout" }));

    await waitFor(() =>
      expect(recordPayoutAction).toHaveBeenCalledWith({
        instructorId: "instructor-1",
        amount: 250.5,
        reference: "TX-123",
      }),
    );
    expect(toast.result).toHaveBeenCalled();
  });
});
