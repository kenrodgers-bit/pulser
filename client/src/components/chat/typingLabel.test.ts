import { describe, expect, it } from "vitest";

import { formatTypingLabel } from "./typingLabel";

describe("formatTypingLabel", () => {
  it("returns null when nobody is typing", () => {
    expect(formatTypingLabel([])).toBeNull();
  });

  it("formats a single typer name", () => {
    expect(formatTypingLabel(["Maya"])).toBe("Maya is typing...");
  });

  it("formats two typer names", () => {
    expect(formatTypingLabel(["Maya", "Theo"])).toBe("Maya and Theo are typing...");
  });

  it("formats three typer names", () => {
    expect(formatTypingLabel(["Maya", "Theo", "Jules"])).toBe(
      "Maya, Theo, and Jules are typing...",
    );
  });

  it("collapses longer typing lists after the first two names", () => {
    expect(formatTypingLabel(["Maya", "Theo", "Jules", "Ari"])).toBe(
      "Maya, Theo, and 2 others are typing...",
    );
  });
});
