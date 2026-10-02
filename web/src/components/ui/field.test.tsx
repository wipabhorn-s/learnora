import { FieldLabel, RequiredFieldsNote } from "@/components/ui/field";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("FieldLabel required / optional markers", () => {
  it("marks a required field with * and a screen-reader word", () => {
    render(
      <>
        <FieldLabel required htmlFor="title">
          Course title
        </FieldLabel>
        <input id="title" />
      </>,
    );

    // ชื่อที่โปรแกรมอ่านหน้าจออ่าน: ไม่มี "*" (aria-hidden) แต่มีคำว่า required
    expect(
      screen.getByRole("textbox", { name: /^Course title\s*\(required\)$/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden");
  });

  it("marks an optional field with (optional)", () => {
    render(
      <>
        <FieldLabel optional htmlFor="subtitle">
          Subtitle
        </FieldLabel>
        <input id="subtitle" />
      </>,
    );

    expect(screen.getByText("(optional)")).toBeInTheDocument();
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("renders a plain label when neither is set", () => {
    render(<FieldLabel>Email</FieldLabel>);

    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.queryByText("*")).not.toBeInTheDocument();
    expect(screen.queryByText("(optional)")).not.toBeInTheDocument();
  });

  it("explains the * on long forms", () => {
    render(<RequiredFieldsNote />);
    expect(screen.getByText(/are required/)).toBeInTheDocument();
  });
});
