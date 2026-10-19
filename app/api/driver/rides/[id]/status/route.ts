import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to continue." },
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

    const body = await request.json();
    const newStatus = body.status;

    if (!["in_progress", "completed"].includes(newStatus)) {
      return NextResponse.json(
        { error: "Invalid ride status." },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
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
        { error: "Only registered drivers can update rides." },
        { status: 403 }
      );
    }

    const allowedPreviousStatus =
      newStatus === "in_progress" ? "accepted" : "in_progress";

    const { data: ride, error: rideError } = await supabaseAdmin
      .from("rides")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rideId)
      .eq("driver_clerk_id", userId)
      .eq("status", allowedPreviousStatus)
      .select("id, status")
      .maybeSingle();

    if (rideError) {
      console.error("Ride status update failed:", rideError.message);
      return NextResponse.json(
        { error: "Could not update ride status." },
        { status: 500 }
      );
    }

    if (!ride) {
      return NextResponse.json(
        {
          error:
            "Ride not found, not assigned to you, or its status has changed.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Ride status updated successfully.",
      ride,
    });
  } catch (error) {
    console.error("Update ride status API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}