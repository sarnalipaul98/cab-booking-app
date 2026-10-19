
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to accept a ride." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const rideId = Number(id);

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return NextResponse.json(
        { error: "Invalid ride ID." },
        { status: 400 }
      );
    }

    // Verify driver role and availability.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("role, is_available")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Driver profile lookup failed:", profileError.message);
      return NextResponse.json(
        { error: "Could not verify your driver profile." },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "driver") {
      return NextResponse.json(
        { error: "Only registered drivers can accept rides." },
        { status: 403 }
      );
    }

    if (profile.is_available !== true) {
      return NextResponse.json(
        { error: "Please mark yourself as available before accepting rides." },
        { status: 403 }
      );
    }

    // Verify that the ride exists and is still available.
    const { data: ride, error: rideError } = await supabaseAdmin
      .from("rides")
      .select("id, driver_clerk_id, status")
      .eq("id", rideId)
      .maybeSingle();

    if (rideError) {
      console.error("Ride lookup failed:", rideError.message);
      return NextResponse.json(
        { error: "Could not verify this ride." },
        { status: 500 }
      );
    }

    if (
      !ride ||
      ride.status !== "requested" ||
      ride.driver_clerk_id !== null
    ) {
      return NextResponse.json(
        { error: "This ride is no longer available." },
        { status: 409 }
      );
    }

    // Atomically accept only if the ride is still unassigned.
    const { data: accepted, error } = await supabaseAdmin.rpc(
      "accept_ride",
      {
        p_ride_id: rideId,
        p_driver_clerk_id: userId,
      }
    );

    if (error) {
      console.error("Ride acceptance failed:", error.message);
      return NextResponse.json(
        { error: "Could not accept this ride." },
        { status: 500 }
      );
    }

    if (accepted !== true) {
      return NextResponse.json(
        { error: "This ride is no longer available." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Ride accepted successfully.",
      rideId,
      status: "accepted",
    });
  } catch (error) {
    console.error("Accept ride API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
