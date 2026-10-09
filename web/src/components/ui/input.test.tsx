import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

describe("Input noAutofill", () => {
  it("starts read-only so the browser cannot fill saved credentials", () => {
    render(<PasswordInput aria-label="Password" noAutofill />);

    expect(screen.getByLabelText("Password")).toHaveAttribute("readonly");
  });

  it("unlocks on click and accepts typing straight away", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" noAutofill />);
    const input = screen.getByLabelText("Password");

    await user.click(input);
    await user.keyboard("secret");

    expect(input).not.toHaveAttribute("readonly");
    expect(input).toHaveValue("secret");
  });

  it("unlocks when reached with the Tab key", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Email" noAutofill />);

    await user.tab();
    await user.keyboard("a@b.co");

    expect(screen.getByLabelText("Email")).toHaveValue("a@b.co");
  });

  it("is editable from the start without the option", () => {
    render(<Input aria-label="Name" />);

    expect(screen.getByLabelText("Name")).not.toHaveAttribute("readonly");
  });
});
