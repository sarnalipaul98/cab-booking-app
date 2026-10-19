
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to continue." },
        { status: 401 }
      );
    }

    const { rideId } = await request.json();
    const id = Number(rideId);

    if (
      rideId === undefined ||
      rideId === null ||
      rideId === "" ||
      !Number.isSafeInteger(id) ||
      id <= 0
    ) {
      return NextResponse.json(
        { error: "A valid ride ID is required." },
        { status: 400 }
      );
    }

    const { data: ride, error } = await supabaseAdmin
      .from("rides")
      .select("id, rider_clerk_id, estimated_fare, status, payment_status")
      .eq("id", id)
      .eq("rider_clerk_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Could not fetch ride:", error.message);
      return NextResponse.json(
        { error: "Could not retrieve ride details." },
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
        { error: "Payment is available after the ride is completed." },
        { status: 400 }
      );
    }

    if (ride.payment_status === "paid") {
      return NextResponse.json(
        { error: "This ride has already been paid." },
        { status: 409 }
      );
    }

    const fare = Number(ride.estimated_fare);

    if (!Number.isFinite(fare) || fare <= 0) {
      return NextResponse.json(
        { error: "The ride fare is invalid." },
        { status: 400 }
      );
    }

    // DEMO ONLY: No real money is collected.
    const { data: updatedRide, error: updateError } =
      await supabaseAdmin
        .from("rides")
        .update({ payment_status: "paid" })
        .eq("id", id)
        .eq("rider_clerk_id", userId)
        .neq("payment_status", "paid")
        .select("id")
        .maybeSingle();

    if (updateError) {
      console.error("Could not update payment status:", updateError.message);
      return NextResponse.json(
        { error: "Could not complete demo payment." },
        { status: 500 }
      );
    }

    if (!updatedRide) {
      return NextResponse.json(
        { error: "This ride has already been paid or its status changed." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      demo: true,
      message: "Demo payment successful. No real money was collected.",
      rideId: updatedRide.id,
      amount: fare,
      paymentStatus: "paid",
    });
  } catch (error) {
    console.error("Demo payment failed:", error);
    return NextResponse.json(
      { error: "Could not complete demo payment. Please try again." },
      { status: 500 }
    );
  }
}
