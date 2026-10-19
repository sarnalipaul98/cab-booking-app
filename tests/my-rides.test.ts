import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/my-rides/route";

const { mockAuth, mockFrom, mockSelect, mockEq, mockOrder } =
  vi.hoisted(() => ({
    mockAuth: vi.fn(),
    mockFrom: vi.fn(),
    mockSelect: vi.fn(),
    mockEq: vi.fn(),
    mockOrder: vi.fn(),
  }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}));

describe("GET /api/my-rides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ order: mockOrder });
  });

  it("returns 401 when the rider is not signed in", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Please sign in to view your rides.");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns ride history for a signed-in rider", async () => {
    const sampleRides = [
      {
        id: 101,
        pickup_address: "City Centre",
        destination_address: "Railway Station",
        ride_type: "standard",
        estimated_fare: 150,
        status: "completed",
        created_at: "2026-10-10T10:00:00Z",
      },
    ];

    mockAuth.mockResolvedValue({ userId: "test-rider-123" });
    mockOrder.mockResolvedValue({
      data: sampleRides,
      error: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.rides).toEqual(sampleRides);
    expect(mockFrom).toHaveBeenCalledWith("rides");
    expect(mockEq).toHaveBeenCalledWith(
      "rider_clerk_id",
      "test-rider-123"
    );
  });
});


