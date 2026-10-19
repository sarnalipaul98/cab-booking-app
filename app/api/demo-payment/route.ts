
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in first." },
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

    const { data: ride, error: rideError } = await supabaseAdmin
      .from("rides")
      .select("id, estimated_fare, status, payment_status")
      .eq("id", id)
      .eq("rider_clerk_id", userId)
      .maybeSingle();

    if (rideError) {
      console.error("Ride lookup failed:", rideError.message);
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
        { error: "Complete the ride before making a payment." },
        { status: 400 }
      );
    }

    if (ride.payment_status === "paid") {
      return NextResponse.json(
        { error: "This ride is already marked as paid." },
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
      console.error("Payment update failed:", updateError.message);
      return NextResponse.json(
        { error: "Could not update payment status." },
        { status: 500 }
      );
    }

    if (!updatedRide) {
      return NextResponse.json(
        { error: "Payment status was not updated. Please refresh and try again." },
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
      { error: "Could not process the demo request." },
      { status: 500 }
    );
  }
}
