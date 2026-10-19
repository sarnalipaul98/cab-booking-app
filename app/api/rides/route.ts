
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in to request a ride." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      pickup_address,
      pickup_latitude,
      pickup_longitude,
      destination_address,
      destination_latitude,
      destination_longitude,
      ride_type,
    } = body;

    const validRideTypes = ["Economy", "Sedan", "SUV"];

    if (
      typeof pickup_address !== "string" ||
      !pickup_address.trim() ||
      typeof destination_address !== "string" ||
      !destination_address.trim() ||
      typeof pickup_latitude !== "number" ||
      !Number.isFinite(pickup_latitude) ||
      pickup_latitude < -90 ||
      pickup_latitude > 90 ||
      typeof pickup_longitude !== "number" ||
      !Number.isFinite(pickup_longitude) ||
      pickup_longitude < -180 ||
      pickup_longitude > 180 ||
      typeof destination_latitude !== "number" ||
      !Number.isFinite(destination_latitude) ||
      destination_latitude < -90 ||
      destination_latitude > 90 ||
      typeof destination_longitude !== "number" ||
      !Number.isFinite(destination_longitude) ||
      destination_longitude < -180 ||
      destination_longitude > 180 ||
      !validRideTypes.includes(ride_type)
    ) {
      return NextResponse.json(
        { error: "Please provide valid pickup, destination, and ride type." },
        { status: 400 }
      );
    }

    // Calculate approximate straight-line distance for the fare.
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const latDifference = toRadians(
      destination_latitude - pickup_latitude
    );
    const lngDifference = toRadians(
      destination_longitude - pickup_longitude
    );

    const a =
      Math.sin(latDifference / 2) ** 2 +
      Math.cos(toRadians(pickup_latitude)) *
        Math.cos(toRadians(destination_latitude)) *
        Math.sin(lngDifference / 2) ** 2;

    const distanceKm =
      earthRadiusKm *
      2 *
      Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const multiplier =
      ride_type === "SUV" ? 2 : ride_type === "Sedan" ? 1.5 : 1;

    const estimatedFare = Math.round(
      (40 + distanceKm * 12) * multiplier
    );

    // Find available drivers within 10 km of the pickup.
    const { data: drivers, error: driverError } = await supabaseAdmin
      .from("user_profiles")
      .select("clerk_user_id, full_name, latitude, longitude")
      .eq("role", "driver")
      .eq("is_available", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (driverError) {
      console.error("Nearby driver lookup failed:", driverError.message);
      return NextResponse.json(
        { error: "Could not check driver availability. Please try again." },
        { status: 500 }
      );
    }

    const nearbyDrivers = (drivers ?? [])
      .map((driver) => {
        const dLat = toRadians(driver.latitude - pickup_latitude);
        const dLng = toRadians(driver.longitude - pickup_longitude);

        const distanceFactor =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRadians(pickup_latitude)) *
            Math.cos(toRadians(driver.latitude)) *
            Math.sin(dLng / 2) ** 2;

        const distanceToPickup =
          earthRadiusKm *
          2 *
          Math.atan2(
            Math.sqrt(distanceFactor),
            Math.sqrt(Math.max(0, 1 - distanceFactor))
          );

        return {
          name: driver.full_name || "Available driver",
          distanceKm: Number(distanceToPickup.toFixed(2)),
        };
      })
      .filter((driver) => driver.distanceKm <= 10)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    // Save the ride even if no driver is currently nearby.
    const { data: ride, error: rideError } = await supabaseAdmin
      .from("rides")
      .insert({
        rider_clerk_id: userId,
        pickup_address: pickup_address.trim(),
        pickup_latitude,
        pickup_longitude,
        destination_address: destination_address.trim(),
        destination_latitude,
        destination_longitude,
        ride_type,
        estimated_fare: estimatedFare,
        status: "requested",
      })
      .select("id, estimated_fare, status")
      .single();

    if (rideError) {
      console.error("Ride creation failed:", rideError.message);
      return NextResponse.json(
        { error: "Could not save your ride. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Ride requested successfully.",
        ride,
        nearbyDriverCount: nearbyDrivers.length,
        nearbyDrivers,
        matchingRadiusKm: 10,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Ride API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
