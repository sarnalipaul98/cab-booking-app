import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { connection } from "next/server";

export async function GET() {

  await connection();

    // Keep the rest of your existing code unchanged.
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to view your ratings." },
        { status: 401 }
      );
    }

    const { data: reviews, error } = await supabaseAdmin
      .from("ride_reviews")
      .select("id, ride_id, rating, review, created_at")
      .eq("driver_clerk_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Driver ratings error:", error.message);
      return NextResponse.json(
        { error: "Could not load your ratings." },
        { status: 500 }
      );
    }

    const allReviews = reviews ?? [];
    const totalReviews = allReviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round(
            (allReviews.reduce((sum, item) => sum + item.rating, 0) /
              totalReviews) *
              100
          ) / 100
        : null;

    return NextResponse.json({
      reviews: allReviews,
      averageRating,
      totalReviews,
    });
  } catch (error) {
    console.error("Driver ratings API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}