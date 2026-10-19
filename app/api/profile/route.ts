
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";


export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, full_name, email, phone, role, created_at, avatar_path")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Profile lookup failed:", error.message);
    return NextResponse.json(
      { error: "Could not load profile." },
      { status: 500 }
    );
  }

  let avatarUrl = "";

  if (data?.avatar_path) {
    const { data: signedData, error: signedError } =
      await supabaseAdmin.storage
        .from("profile-pictures")
        .createSignedUrl(data.avatar_path, 60 * 60);

    if (!signedError && signedData) {
      avatarUrl = signedData.signedUrl;
    }
  }

  return NextResponse.json({ profile: data, avatarUrl });
}


export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }

  const user = await currentUser();

  if (!user) {
    return NextResponse.json(
      { error: "User details not found." },
      { status: 404 }
    );
  }

  const email =
    user.emailAddresses.find(
      (item) => item.id === user.primaryEmailAddressId
    )?.emailAddress ?? null;

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || null;

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        clerk_user_id: userId,
        full_name: fullName,
        email,
      },
      { onConflict: "clerk_user_id" }
    )
    .select("id, full_name, email, role")
    .single();

  if (error) {
    console.error("Profile save failed:", error.message);
    console.error("Profile save failed:", error);
console.error("Underlying cause:", error.cause);
    return NextResponse.json(
      { error: "Could not save profile." },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: "Profile saved successfully.", profile: data });
}


export async function PATCH(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }

  let body: { full_name?: unknown; phone?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request data." },
      { status: 400 }
    );
  }

  const fullName =
    typeof body.full_name === "string"
      ? body.full_name.trim()
      : "";

  const phone =
    typeof body.phone === "string"
      ? body.phone.trim()
      : "";

  if (!fullName || fullName.length > 100) {
    return NextResponse.json(
      { error: "Name is required and must be under 100 characters." },
      { status: 400 }
    );
  }

  if (phone.length > 20) {
    return NextResponse.json(
      { error: "Phone number must be under 20 characters." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(
      {
        clerk_user_id: userId,
        full_name: fullName,
        phone: phone || null,
      },
      { onConflict: "clerk_user_id" }
    )
    .select("id, full_name, email, phone, role, created_at")
    .single();

  if (error) {
    console.error("Profile update failed:", error.message);

    return NextResponse.json(
      { error: "Could not update profile." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Profile updated successfully.",
    profile: data,
  });
}
