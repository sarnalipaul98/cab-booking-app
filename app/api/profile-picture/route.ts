
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";


export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Please select an image." },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Please upload an image file." },
      { status: 400 }
    );
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Image must be 2 MB or smaller." },
      { status: 400 }
    );
  }

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension = extensionByType[file.type];

  if (!extension) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, or WebP image." },
      { status: 400 }
    );
  }

  const path = `${userId}/avatar.${extension}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from("profile-pictures")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("Picture upload failed:", uploadError.message);

    return NextResponse.json(
      { error: "Could not upload the picture. Check your storage bucket." },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("user_profiles")
    .update({ avatar_path: path })
    .eq("clerk_user_id", userId);

  if (updateError) {
    console.error("Picture path update failed:", updateError.message);

    return NextResponse.json(
      { error: "Picture uploaded, but profile could not be updated." },
      { status: 500 }
    );
  }

  const { data: signedData, error: signedError } =
    await supabaseAdmin.storage
      .from("profile-pictures")
      .createSignedUrl(path, 60 * 60);

  if (signedError || !signedData) {
    return NextResponse.json(
      { error: "Picture uploaded, but its display link could not be created." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Profile picture uploaded successfully.",
    avatarUrl: signedData.signedUrl,
  });
}
