import { describe, expect, it } from "vitest";
import { ConstruktClientError, friendlyClientError } from "./program";
import type { ConstruktErrorCode } from "./program";

describe("friendlyClientError", () => {
  it("maps ConstruktClientError codes to user-facing copy", () => {
    const codes: ConstruktErrorCode[] = [
      "Unauthorized",
      "InvalidApprovalOrder",
      "ContractorCannotApprove",
      "RequestOnHold",
      "InsufficientRemainingCap",
    ];
    for (const code of codes) {
      const message = friendlyClientError(new ConstruktClientError(code));
      expect(message).toBeTruthy();
      // Friendly messages should never just echo the code name back.
      expect(message).not.toBe(code);
    }
  });

  it("falls back to err.message for non-Construkt errors", () => {
    expect(friendlyClientError(new Error("network down"))).toBe("network down");
  });

  it("uses budget-safe copy for shared cap errors", () => {
    expect(
      friendlyClientError(
        new ConstruktClientError("InsufficientRemainingCap"),
      ),
    ).toBe("Amount would exceed the remaining project or package cap.");
  });

  it("stringifies non-Error values", () => {
    expect(friendlyClientError("oops")).toBe("oops");
    expect(friendlyClientError(42)).toBe("42");
  });
});
