import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { hashToken } from "./tokens";

describe("hashToken", () => {
  it("hashes refresh tokens with sha256", () => {
    const token = "test-refresh-token";
    expect(hashToken(token)).toBe(createHash("sha256").update(token).digest("hex"));
  });

  it("is deterministic", () => {
    expect(hashToken("abc")).toHaveLength(64);
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abcd"));
  });
});
