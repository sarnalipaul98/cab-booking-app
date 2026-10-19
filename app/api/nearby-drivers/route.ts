import { connection, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";


export async function GET(request: Request) {
  await connection();
  try {
    const { searchParams } = new URL(request.url);

    const latitude = Number(searchParams.get("latitude"));
    const longitude = Number(searchParams.get("longitude"));
    const radiusKm = 10;

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      searchParams.get("latitude") === null ||
      searchParams.get("longitude") === null ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { error: "Valid pickup coordinates are required." },
        { status: 400 }
      );
    }

    const { data: drivers, error } = await supabaseAdmin
      .from("user_profiles")
      .select("clerk_user_id, full_name, latitude, longitude")
      .eq("role", "driver")
      .eq("is_available", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (error) {
      console.error("Nearby driver lookup failed:", error.message);
      return NextResponse.json(
        { error: "Could not find available drivers." },
        { status: 500 }
      );
    }

    const nearbyDrivers = (drivers ?? [])
      .map((driver) => {
        const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
        const earthRadiusKm = 6371;

        const dLat = toRadians(driver.latitude - latitude);
        const dLon = toRadians(driver.longitude - longitude);

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRadians(latitude)) *
            Math.cos(toRadians(driver.latitude)) *
            Math.sin(dLon / 2) ** 2;

        const distanceKm =
          earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return {
          name: driver.full_name || "Available driver",
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      })
      .filter((driver) => driver.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json({
      radiusKm,
      count: nearbyDrivers.length,
      drivers: nearbyDrivers,
    });
  } catch (error) {
    console.error("Nearby drivers API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
