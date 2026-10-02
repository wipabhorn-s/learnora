import { outputSize } from "@/lib/crop-image";
import { describe, expect, it } from "vitest";

describe("outputSize", () => {
  it("shrinks a large avatar crop down to 512×512", () => {
    expect(
      outputSize({ width: 2400, height: 2400 }, { width: 512, height: 512 }),
    ).toEqual({
      width: 512,
      height: 512,
    });
  });

  it("does not enlarge a small crop (would look blurry)", () => {
    expect(
      outputSize({ width: 300, height: 300 }, { width: 512, height: 512 }),
    ).toEqual({
      width: 300,
      height: 300,
    });
  });

  it("keeps a 16:9 thumbnail at most 1280×720", () => {
    expect(
      outputSize({ width: 3840, height: 2160 }, { width: 1280, height: 720 }),
    ).toEqual({
      width: 1280,
      height: 720,
    });
  });

  it("keeps the selected aspect ratio", () => {
    const size = outputSize(
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
    );
    expect(size.width / size.height).toBeCloseTo(16 / 9, 2);
  });
});
