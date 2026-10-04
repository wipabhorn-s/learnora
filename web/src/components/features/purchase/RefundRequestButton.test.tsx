import RefundRequestButton from "@/components/features/purchase/RefundRequestButton";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestRefundAction, toast } = vi.hoisted(() => ({
  requestRefundAction: vi.fn(),
  toast: { result: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/actions/purchase.action", () => ({ requestRefundAction }));
vi.mock("@/lib/toast", () => ({ toast }));

function renderButton() {
  render(
    <RefundRequestButton
      purchaseItemId="item-1"
      courseTitle="Python Programming Fundamentals"
      amount="490.00"
      deadline="2026-10-15T00:00:00.000Z"
    />,
  );
}

describe("RefundRequestButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("explains that only this course is refunded", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Refund" }));

    expect(screen.getByText("Request a refund of ฿490")).toBeInTheDocument();
    expect(
      screen.getByText(/Python Programming Fundamentals/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Other courses in the same order/),
    ).toBeInTheDocument();
  });

  it("asks for a longer reason before sending", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Refund" }));
    await user.type(
      screen.getByLabelText(/Why are you requesting/),
      "Too short",
    );
    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(screen.getByText(/at least 10 characters/)).toBeInTheDocument();
    expect(requestRefundAction).not.toHaveBeenCalled();
  });

  it("sends the request for this course and closes on success", async () => {
    const user = userEvent.setup();
    requestRefundAction.mockResolvedValue({ success: true, message: "Sent" });
    renderButton();

    await user.click(screen.getByRole("button", { name: "Refund" }));
    await user.type(
      screen.getByLabelText(/Why are you requesting/),
      "The content is not what I expected.",
    );
    await user.click(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() =>
      expect(requestRefundAction).toHaveBeenCalledWith(
        "item-1",
        "The content is not what I expected.",
      ),
    );
    expect(toast.result).toHaveBeenCalledWith({
      success: true,
      message: "Sent",
    });
    await waitFor(() =>
      expect(
        screen.queryByText("Request a refund of ฿490"),
      ).not.toBeInTheDocument(),
    );
  });

  it("keeps the dialog open when the API refuses", async () => {
    const user = userEvent.setup();
    requestRefundAction.mockResolvedValue({
      success: false,
      message: "Refunds can only be requested within 14 days of purchase",
      code: "HTTP_400",
    });
    renderButton();

    await user.click(screen.getByRole("button", { name: "Refund" }));
    await user.type(
      screen.getByLabelText(/Why are you requesting/),
      "The content is not what I expected.",
    );
    await user.click(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => expect(toast.result).toHaveBeenCalled());
    expect(screen.getByText("Request a refund of ฿490")).toBeInTheDocument();
  });
});
