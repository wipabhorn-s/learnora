import NotFound from "@/app/not-found";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// next/font ใช้ได้เฉพาะตอน build ของ Next ใน test คืนชื่อคลาสหลอกแทน
vi.mock("next/font/google", () => ({
  Fredoka: () => ({ className: "font-fredoka" }),
}));

describe("404 page", () => {
  it("shows the big 404 and the friendly message", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("404");
    expect(
      screen.getByRole("heading", { name: "Oops! This page flew away" }),
    ).toBeInTheDocument();
  });

  it("links back to the home page", () => {
    render(<NotFound />);

    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("shows the witch as decoration only, bobbing in place (no flying across)", () => {
    const { container } = render(<NotFound />);
    const witch = container.querySelector<HTMLImageElement>(
      'img[src="/witch/witch-broom-cutout.webp"]',
    )!;

    // ตกแต่งล้วน: โปรแกรมอ่านหน้าจอข้ามไป
    expect(witch).toHaveAttribute("alt", "");
    expect(witch.closest("[aria-hidden]")).not.toBeNull();

    expect(witch).toHaveClass("animate-broom-float");
    expect(container.querySelector(".animate-broom-path")).toBeNull();
  });
});
