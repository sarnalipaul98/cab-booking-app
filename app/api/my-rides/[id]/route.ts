
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to view this receipt." },
        { status: 401 }
      );
    }

    const { id: rawId } = await context.params;
    const id = Number(rawId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Invalid ride ID." },
        { status: 400 }
      );
    }

    const { data: ride, error } = await supabaseAdmin
      .from("rides")
      .select(
        "id, rider_clerk_id, pickup_address, destination_address, ride_type, estimated_fare, status, payment_status, created_at"
      )
      .eq("id", id)
      .eq("rider_clerk_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Receipt lookup failed:", error.message);
      return NextResponse.json(
        { error: "Could not load receipt." },
        { status: 500 }
      );
    }

    if (!ride) {
      return NextResponse.json(
        { error: "Ride not found." },
        { status: 404 }
      );
    }

    if (ride.status !== "completed") {
      return NextResponse.json(
        { error: "A receipt is available after ride completion." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ride });
  } catch (error) {
    console.error("Receipt API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
