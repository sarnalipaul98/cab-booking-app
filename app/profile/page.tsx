
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

type Profile = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  avatar_path?: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Loading profile...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile");
        const data = await response.json();

        if (!response.ok) {
          setMessage(data.error || "Please sign in first.");
          return;
        }

        if (data.profile) {
          setProfile(data.profile);
          setName(data.profile.full_name || "");
          setPhone(data.profile.phone || "");
          setAvatarUrl(data.avatarUrl || "");
          setMessage("");
        } else {
          setMessage("No saved profile found. Please try again.");
        }
      } catch {
        setMessage("Could not load your profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("Saving profile...");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name, phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Could not save profile.");
        return;
      }

      setProfile(data.profile);
      setMessage("Profile updated successfully!");
    } catch {
      setMessage("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  
async function uploadPicture(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];

  if (!file) return;

  setUploading(true);
  setMessage("Uploading picture...");

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/profile-picture", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || "Could not upload picture.");
      return;
    }

    setAvatarUrl(data.avatarUrl);
    setMessage("Profile picture uploaded successfully!");
  } catch {
    setMessage("Could not upload picture. Please try again.");
  } finally {
    setUploading(false);
    event.target.value = "";
  }
}


  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="font-medium text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </Link>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="mt-2 text-slate-600">
            View and update your personal details.
          </p>

          
<div className="mt-6 flex flex-col items-center gap-3">
  {avatarUrl ? (
    <Image
  src={avatarUrl}
  alt="Profile picture"
  width={112}
  height={112}
  unoptimized
  className="h-28 w-28 rounded-full border-2 border-slate-200 object-cover"
/>
  ) : (
    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-200 text-3xl font-bold text-slate-500">
      {name ? name.charAt(0).toUpperCase() : "?"}
    </div>
  )}

  <label
    htmlFor="profile-picture"
    className="cursor-pointer rounded-xl bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700"
  >
    {uploading ? "Uploading..." : "Choose Profile Picture"}
  </label>

  <input
    id="profile-picture"
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={uploadPicture}
    disabled={uploading}
    className="hidden"
  />

  <p className="text-xs text-slate-500">
    JPG, PNG or WebP · Maximum 2 MB
  </p>
</div>


          {loading ? (
            <p className="mt-6 text-slate-600">{message}</p>
          ) : (
            <form onSubmit={saveProfile} className="mt-6 space-y-5">
              <div>
                <label htmlFor="full_name" className="mb-2 block font-medium">
                  Full Name
                </label>
                <input
                  id="full_name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block font-medium">
                  Email Address
                </label>
                <input
                  id="email"
                  value={profile?.email || ""}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block font-medium">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  maxLength={20}
                  placeholder="Enter your phone number"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              {message && (
                <p role="status" className="text-sm text-slate-600">
                  {message}
                </p>
              )}
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
