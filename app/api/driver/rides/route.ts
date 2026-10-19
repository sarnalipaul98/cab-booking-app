
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { connection, NextResponse } from "next/server";



export async function GET() {
  await connection();
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to continue." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("role, clerk_user_id")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Driver profile lookup error:", profileError);
      return NextResponse.json(
        { error: "Could not verify your driver profile." },
        { status: 500 }
      );
    }

    if (!profile || profile.role !== "driver") {
      return NextResponse.json(
        { error: "Only registered drivers can view ride requests." },
        { status: 403 }
      );
    }

    const { data: rides, error: ridesError } = await supabaseAdmin
      .from("rides")
      .select(
        "id, rider_clerk_id, driver_clerk_id, pickup_address, destination_address, ride_type, estimated_fare, status"
      )
      .or(
        `and(status.eq.requested,driver_clerk_id.is.null),and(driver_clerk_id.eq.${userId},status.in.(accepted,in_progress))`
      )
      .order("id", { ascending: false });

    if (ridesError) {
      console.error("Driver rides query error:", ridesError);
      return NextResponse.json(
        { error: "Could not load ride requests." },
        { status: 500 }
      );
    }

    const visibleRides = (rides ?? []).filter((ride) => {
      if (ride.driver_clerk_id === userId) {
        return ride.status === "accepted" || ride.status === "in_progress";
      }

      return ride.status === "requested" && ride.driver_clerk_id === null;
    });

    return NextResponse.json({
      radiusKm: 10,
      rides: visibleRides,
    });
  } catch (error) {
    console.error("Driver rides API error:", error);
    return NextResponse.json(
      { error: "Unable to load driver ride requests." },
      { status: 500 }
    );
  }
}
