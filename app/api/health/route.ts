
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const { error } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Supabase error:", error.message);

      return NextResponse.json(
        { status: "error", message: "Database connection failed." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Cab Booking App database connected successfully!",
    });
  } catch (error) {
    console.error("Database error:", error);

    return NextResponse.json(
      { status: "error", message: "Unable to connect to database." },
      { status: 500 }
    );
  }
}