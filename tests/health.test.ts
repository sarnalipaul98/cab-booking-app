
import { describe, expect, it } from "vitest";

describe("Cab booking app basic checks", () => {
  it("confirms the test environment is working", () => {
    expect(1 + 1).toBe(2);
  });

  it("rejects an invalid ride ID", () => {
    const rideId = Number("invalid");

    expect(Number.isSafeInteger(rideId)).toBe(false);
  });
});
