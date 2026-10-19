import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to submit a review." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const rideId = Number(body.rideId);
    const rating = Number(body.rating);
    const review =
      typeof body.review === "string" ? body.review.trim() : "";

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return NextResponse.json(
        { error: "Invalid ride ID." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5 stars." },
        { status: 400 }
      );
    }

    if (review.length > 1000) {
      return NextResponse.json(
        { error: "Review must be 1000 characters or fewer." },
        { status: 400 }
      );
    }

    const { data: ride, error: rideError } = await supabaseAdmin
      .from("rides")
      .select("id, rider_clerk_id, driver_clerk_id, status")
      .eq("id", rideId)
      .eq("rider_clerk_id", userId)
      .maybeSingle();

    if (rideError) {
      console.error("Review ride lookup failed:", rideError.message);
      return NextResponse.json(
        { error: "Could not verify this ride." },
        { status: 500 }
      );
    }

    if (!ride) {
      return NextResponse.json(
        { error: "Ride not found or you are not its rider." },
        { status: 404 }
      );
    }

    if (ride.status !== "completed") {
      return NextResponse.json(
        { error: "You can review only completed rides." },
        { status: 400 }
      );
    }

    if (!ride.driver_clerk_id) {
      return NextResponse.json(
        { error: "This ride has no assigned driver to review." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("ride_reviews")
      .insert({
        ride_id: ride.id,
        rider_clerk_id: userId,
        driver_clerk_id: ride.driver_clerk_id,
        rating,
        review: review || null,
      })
      .select("id, ride_id, rating, review, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You have already reviewed this ride." },
          { status: 409 }
        );
      }

      console.error("Review insert failed:", error.message);
      return NextResponse.json(
        { error: "Could not save your review." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Review submitted successfully.", review: data },
      { status: 201 }
    );
  } catch (error) {
    console.error("Reviews API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");

    if (!driverId || driverId.length > 256) {
      return NextResponse.json(
        { error: "A valid driverId is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("ride_reviews")
      .select("rating")
      .eq("driver_clerk_id", driverId);

    if (error) {
      console.error("Driver ratings lookup failed:", error.message);
      return NextResponse.json(
        { error: "Could not load driver ratings." },
        { status: 500 }
      );
    }

    const reviews = data ?? [];
    const averageRating = reviews.length
      ? Math.round(
          (reviews.reduce((sum, item) => sum + item.rating, 0) /
            reviews.length) *
            10
        ) / 10
      : null;

    return NextResponse.json({
      averageRating,
      totalReviews: reviews.length,
    });
  } catch (error) {
    console.error("Driver ratings API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}