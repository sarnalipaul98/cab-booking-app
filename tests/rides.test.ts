
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/rides/route";

const { mockAuth, mockFrom } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}));

describe("POST /api/rides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the rider is not signed in", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = new Request("http://localhost/api/rides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Please sign in to request a ride.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 400 when booking details are invalid", async () => {
    mockAuth.mockResolvedValue({ userId: "test-rider-123" });

    const request = new Request("http://localhost/api/rides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickup_address: "",
        destination_address: "Railway Station",
        pickup_latitude: 17.385,
        pickup_longitude: 78.4867,
        destination_latitude: 17.4,
        destination_longitude: 78.5,
        ride_type: "Economy",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe(
      "Please provide valid pickup, destination, and ride type."
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
