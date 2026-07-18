import { describe, expect, it } from "vitest";
import { isRedistributableLicense } from "./catalogLicense";

describe("isRedistributableLicense", () => {
  it("accepts CC-BY-SA style licenses", () => {
    expect(isRedistributableLicense({ short_name: "CC-BY-SA 4" })).toBe(true);
    expect(
      isRedistributableLicense({ full_name: "Creative Commons Attribution Share Alike 4" }),
    ).toBe(true);
  });

  it("rejects missing or unknown licenses", () => {
    expect(isRedistributableLicense(null)).toBe(false);
    expect(isRedistributableLicense({ short_name: "All rights reserved" })).toBe(false);
  });
});
