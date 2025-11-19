import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("concatenates arbitrary class names", () => {
    expect(cn("px-2", "py-4", "bg-primary")).toBe("px-2 py-4 bg-primary");
  });

  it("deduplicates conflicting tailwind classes", () => {
    expect(cn("text-sm", "text-lg", { hidden: false, flex: true })).toBe("text-lg flex");
  });
});