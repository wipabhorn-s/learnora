import StringListInput from "@/components/features/course/StringListInput";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

/** ห่อด้วย state จริง ให้ทดสอบเหมือนตอนใช้ในฟอร์ม */
function Harness({
  initial = [],
  maxItems = 3,
  onValue,
}: {
  initial?: string[];
  maxItems?: number;
  onValue?: (value: string[]) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <StringListInput
      id="outcomes"
      value={value}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
      placeholder="Enter a learning outcome"
      addLabel="Add an outcome"
      maxItems={maxItems}
      maxLength={160}
    />
  );
}

describe("StringListInput", () => {
  it("always shows one empty box to type in", () => {
    render(<Harness />);
    expect(
      screen.getAllByPlaceholderText("Enter a learning outcome"),
    ).toHaveLength(1);
    // แถวเดียวลบไม่ได้ (ต้องมีช่องให้พิมพ์เสมอ)
    expect(
      screen.queryByRole("button", { name: /Remove item/ }),
    ).not.toBeInTheDocument();
  });

  it("adds and removes items", async () => {
    const user = userEvent.setup();
    let latest: string[] = [];
    render(<Harness onValue={(value) => (latest = value)} />);

    await user.type(
      screen.getByPlaceholderText("Enter a learning outcome"),
      "Write Python",
    );
    await user.click(screen.getByRole("button", { name: "Add an outcome" }));
    const boxes = screen.getAllByPlaceholderText("Enter a learning outcome");
    expect(boxes).toHaveLength(2);

    await user.type(boxes[1], "Use loops");
    expect(latest).toEqual(["Write Python", "Use loops"]);

    await user.click(screen.getByRole("button", { name: "Remove item 1" }));
    expect(latest).toEqual(["Use loops"]);
  });

  it("hides the add button once the limit is reached", () => {
    render(<Harness initial={["a", "b", "c"]} maxItems={3} />);
    expect(
      screen.queryByRole("button", { name: "Add an outcome" }),
    ).not.toBeInTheDocument();
  });

  it("caps each item at the max length", () => {
    render(<Harness />);
    expect(
      screen.getByPlaceholderText("Enter a learning outcome"),
    ).toHaveAttribute("maxLength", "160");
  });
});
