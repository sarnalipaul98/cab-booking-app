
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to view this review." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rideId = Number(searchParams.get("rideId"));

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return NextResponse.json(
        { error: "Invalid ride ID." },
        { status: 400 }
      );
    }

    const { data: ride, error: rideError } = await supabaseAdmin
      .from("rides")
      .select("id")
      .eq("id", rideId)
      .eq("driver_clerk_id", userId)
      .maybeSingle();

    if (rideError) {
      return NextResponse.json(
        { error: "Could not verify this ride." },
        { status: 500 }
      );
    }

    if (!ride) {
      return NextResponse.json(
        { error: "Ride not found for your driver account." },
        { status: 404 }
      );
    }

    const { data: review, error: reviewError } = await supabaseAdmin
      .from("ride_reviews")
      .select("ride_id, rating, review, created_at")
      .eq("ride_id", rideId)
      .eq("driver_clerk_id", userId)
      .maybeSingle();

    if (reviewError) {
      return NextResponse.json(
        { error: "Could not load the rider review." },
        { status: 500 }
      );
    }

    return NextResponse.json({ review: review ?? null });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
