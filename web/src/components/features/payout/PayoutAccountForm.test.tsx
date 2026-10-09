import PayoutAccountForm from "@/components/features/payout/PayoutAccountForm";
import { savePayoutAccountAction } from "@/lib/actions/payout.action";
import type { PayoutAccount } from "@/lib/api/payout.api";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/payout.action", () => ({
  savePayoutAccountAction: vi.fn(),
}));
vi.mock("@/lib/toast", () => ({ toast: { result: vi.fn() } }));

const account: PayoutAccount = {
  bankCode: "kbank",
  bankName: "Kasikornbank",
  accountName: "Ann Teacher",
  accountNumber: "1234567890",
  updatedAt: "2026-10-09T00:00:00.000Z",
};

const holderName = () => screen.getByLabelText(/Account holder name/);

describe("PayoutAccountForm", () => {
  beforeEach(() => {
    vi.mocked(savePayoutAccountAction).mockReset();
  });

  it("shows a saved account with fields disabled until Edit", () => {
    render(<PayoutAccountForm account={account} />);

    expect(holderName()).toBeDisabled();
    expect(screen.getByRole("combobox", { name: /Bank/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Update account" }),
    ).not.toBeInTheDocument();
  });

  it("Edit unlocks the fields without saving", async () => {
    const user = userEvent.setup();
    render(<PayoutAccountForm account={account} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(holderName()).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Update account" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(savePayoutAccountAction).not.toHaveBeenCalled();
  });

  it("Cancel throws away edits and locks the form again", async () => {
    const user = userEvent.setup();
    render(<PayoutAccountForm account={account} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.clear(holderName());
    await user.type(holderName(), "Someone Else");
    expect(
      screen.getByRole("button", { name: "Update account" }),
    ).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(holderName()).toHaveValue("Ann Teacher");
    expect(holderName()).toBeDisabled();
    expect(savePayoutAccountAction).not.toHaveBeenCalled();
  });

  it("starts editable with only Save when there is no account yet", () => {
    render(<PayoutAccountForm account={null} />);

    expect(holderName()).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Save account" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
  });
});
