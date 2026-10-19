import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !from) {
      return NextResponse.json(
        { error: "Email service is not configured." },
        { status: 500 }
      );
    }

    const { id: rawId } = await context.params;
    const rideId = Number(rawId);

    if (!Number.isSafeInteger(rideId) || rideId <= 0) {
      return NextResponse.json(
        { error: "Invalid ride ID." },
        { status: 400 }
      );
    }

    const { data: ride, error: rideError } = await supabaseAdmin
      .from("rides")
      .select(
        "id, rider_clerk_id, pickup_address, destination_address, ride_type, estimated_fare, status, payment_status, created_at"
      )
      .eq("id", rideId)
      .eq("rider_clerk_id", userId)
      .maybeSingle();

    if (rideError) {
      console.error("Email receipt ride lookup failed:", rideError.message);

      return NextResponse.json(
        { error: "Could not load ride details." },
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
        { error: "Receipts can only be emailed for completed rides." },
        { status: 400 }
      );
    }

    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;

    if (!email || user.id !== userId) {
      return NextResponse.json(
        { error: "No primary email address was found for your account." },
        { status: 400 }
      );
    }

    const safePickup = escapeHtml(ride.pickup_address || "Not available");
    const safeDestination = escapeHtml(
      ride.destination_address || "Not available"
    );
    const safeType = escapeHtml(ride.ride_type || "Standard");
    const fare = Number(ride.estimated_fare).toFixed(2);
    const date = new Date(ride.created_at).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    const safeDate = escapeHtml(date);
    const paymentStatus = escapeHtml(ride.payment_status || "pending");

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from,
      to: [email],
      subject: `Cab Booking App - Receipt for Ride #${ride.id}`,
      text: [
        `Receipt for Ride #${ride.id}`,
        `Pickup: ${ride.pickup_address}`,
        `Destination: ${ride.destination_address}`,
        `Ride type: ${ride.ride_type}`,
        `Ride date: ${date}`,
        `Fare: INR ${fare}`,
        `Payment status: ${ride.payment_status || "pending"}`,
        ride.payment_status === "paid"
          ? "Demo payment recorded. No real money was collected."
          : "Payment is not recorded as paid.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#1e293b">
          <h1 style="color:#2563eb">CAB BOOKING APP</h1>
          <h2>Ride Receipt #${ride.id}</h2>
          <p><strong>Pickup:</strong> ${safePickup}</p>
          <p><strong>Destination:</strong> ${safeDestination}</p>
          <p><strong>Ride type:</strong> ${safeType}</p>
          <p><strong>Ride date:</strong> ${safeDate}</p>
          <p><strong>Payment status:</strong> ${paymentStatus}</p>
          <hr style="margin:24px 0" />
          <h2>Ride fare: ₹${fare}</h2>
          <p style="color:#64748b;font-size:13px">
            ${
              ride.payment_status === "paid"
                ? "Demo payment recorded. No real money was collected."
                : "Payment is not recorded as paid."
            }
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend email error:", error);

      return NextResponse.json(
        { error: "Email could not be sent. Check your Resend sender configuration." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Receipt email sent to ${email}.`,
      emailId: data?.id,
    });
  } catch (error) {
    console.error("Email receipt API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while sending the receipt." },
      { status: 500 }
    );
  }
}