import BecomeInstructorForm from "@/components/features/teach/BecomeInstructorForm";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { becomeInstructorAction, toast } = vi.hoisted(() => ({
  becomeInstructorAction: vi.fn(),
  toast: { result: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/actions/security.action", () => ({ becomeInstructorAction }));
vi.mock("@/lib/toast", () => ({ toast }));

const button = () =>
  screen.getByRole("button", { name: "Become an instructor" });

describe("BecomeInstructorForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sums up the key instructor terms, including the 70% share", () => {
    render(<BecomeInstructorForm />);
    expect(
      screen.getByText(/You keep 70% of every paid sale/),
    ).toBeInTheDocument();
  });

  it("links to the Instructors section of the Terms in a new tab", () => {
    render(<BecomeInstructorForm />);
    const link = screen.getByRole("link", { name: "Terms of Service" });
    expect(link).toHaveAttribute("href", "/terms#instructors");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("keeps the button disabled until the terms are accepted", async () => {
    const user = userEvent.setup();
    render(<BecomeInstructorForm />);

    expect(button()).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    expect(button()).toBeEnabled();
  });

  it("sends the acceptance and shows an error if it fails", async () => {
    const user = userEvent.setup();
    becomeInstructorAction.mockResolvedValue({
      success: false,
      message: "Something went wrong",
      code: "X",
    });
    render(<BecomeInstructorForm />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(button());

    await waitFor(() =>
      expect(becomeInstructorAction).toHaveBeenCalledWith(true),
    );
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });
});
