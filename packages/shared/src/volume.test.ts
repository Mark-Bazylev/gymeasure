import { describe, expect, it } from "vitest";
import { effectiveWeightKg, inferLoadingType, volumeForSets } from "./index";

describe("effectiveWeightKg", () => {
  it("uses external load directly", () => {
    expect(effectiveWeightKg({ loadingType: "external", weightKg: 100, bodyweightKg: 80 })).toBe(100);
  });

  it("adds load to bodyweight", () => {
    expect(effectiveWeightKg({ loadingType: "bodyweight", weightKg: 10, bodyweightKg: 80 })).toBe(90);
  });

  it("subtracts assistance from bodyweight", () => {
    expect(effectiveWeightKg({ loadingType: "assisted", weightKg: 20, bodyweightKg: 80 })).toBe(60);
  });
});

describe("volumeForSets", () => {
  it("counts only completed sets", () => {
    const volume = volumeForSets(
      [
        { weightKg: 100, reps: 5, status: "completed" },
        { weightKg: 100, reps: 5, status: "skipped" },
        { weightKg: 100, reps: 5, status: "pending" },
      ],
      { loadingType: "external" },
    );
    expect(volume).toBe(500);
  });

  it("applies bodyweight loading defaults", () => {
    const volume = volumeForSets(
      [{ weightKg: 0, reps: 10, status: "completed" }],
      { loadingType: "bodyweight", bodyweightKg: 80 },
    );
    expect(volume).toBe(800);
  });
});

describe("inferLoadingType", () => {
  it("detects bodyweight and assisted equipment", () => {
    expect(inferLoadingType("none (bodyweight exercise)")).toBe("bodyweight");
    expect(inferLoadingType("Assisted pull-up machine")).toBe("assisted");
    expect(inferLoadingType("Barbell")).toBe("external");
  });
});
