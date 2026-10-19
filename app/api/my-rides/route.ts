
import { auth } from "@clerk/nextjs/server";
import { connection, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  await connection();
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to view your rides." },
        { status: 401 }
      );
    }

    const { data: rides, error } = await supabaseAdmin
      .from("rides")
      .select(
        "id, pickup_address, destination_address, ride_type, estimated_fare, status, payment_status, created_at"
      )
      .eq("rider_clerk_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Rider rides lookup failed:", error.message);

      return NextResponse.json(
        { error: "Could not load your rides." },
        { status: 500 }
      );
    }

    return NextResponse.json({ rides: rides ?? [] });
  } catch (error) {
    console.error("My rides API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
