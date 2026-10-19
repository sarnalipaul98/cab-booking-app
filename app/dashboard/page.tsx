
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";

type Ride = {
  id: number;
  pickup_address: string;
  destination_address: string;
  ride_type: string;
  estimated_fare: number | string;
  status: string;
  payment_status?: string | null;
  created_at: string;
  updated_at?: string;
};

export default function DashboardPage() {
  const { user } = useUser();

  const [name, setName] = useState("Rider");
  const [email, setEmail] = useState("");
  const [rides, setRides] = useState<Ride[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState("");

  const [paymentMessages, setPaymentMessages] = useState<
    Record<number, string>
  >({});
  const [payingRideId, setPayingRideId] = useState<number | null>(null);

  const [reviewRatings, setReviewRatings] = useState<
    Record<number, number>
  >({});
  const [reviewTexts, setReviewTexts] = useState<
    Record<number, string>
  >({});
  const [reviewMessages, setReviewMessages] = useState<
    Record<number, string>
  >({});
  const [reviewedRides, setReviewedRides] = useState<
    Record<number, boolean>
  >({});
  const [submittingReviewRideId, setSubmittingReviewRideId] =
    useState<number | null>(null);

  async function loadRides() {
    try {
      const response = await fetch("/api/my-rides", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not load your rides.");
        return;
      }

      setRides(data.rides || []);
      setError("");
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  async function demoPayment(rideId: number) {
    setPaymentMessages((current) => ({
      ...current,
      [rideId]: "",
    }));

    setPayingRideId(rideId);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId }),
      });

      const data = await response.json().catch(() => ({}));

      const message = response.ok
        ? `Demo payment successful! Ride #${data.rideId}, fare ₹${Number(
            data.amount
          ).toFixed(2)}. Status: ${data.paymentStatus}. No real money was collected.`
        : data.error ||
          `Demo payment request failed (HTTP ${response.status}).`;

      setPaymentMessages((current) => ({
        ...current,
        [rideId]: message,
      }));

      if (response.ok) {
        await loadRides();
      }
    } catch (err) {
      console.error("Demo payment request failed:", err);

      setPaymentMessages((current) => ({
        ...current,
        [rideId]: "Could not connect to the server. Please try again.",
      }));
    } finally {
      setPayingRideId(null);
    }
  }

  async function submitReview(rideId: number) {
    const rating = reviewRatings[rideId];

    if (!rating) {
      setReviewMessages((current) => ({
        ...current,
        [rideId]: "Please select a star rating.",
      }));
      return;
    }

    setSubmittingReviewRideId(rideId);

    setReviewMessages((current) => ({
      ...current,
      [rideId]: "",
    }));

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId,
          rating,
          review: reviewTexts[rideId] || "",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setReviewedRides((current) => ({
          ...current,
          [rideId]: true,
        }));

        setReviewMessages((current) => ({
          ...current,
          [rideId]: "Thank you! Your review was submitted successfully.",
        }));
      } else {
        setReviewMessages((current) => ({
          ...current,
          [rideId]: data.error || "Could not submit your review.",
        }));
      }
    } catch {
      setReviewMessages((current) => ({
        ...current,
        [rideId]: "Could not connect to the server. Please try again.",
      }));
    } finally {
      setSubmittingReviewRideId(null);
    }
  }

  useEffect(() => {
    let active = true;

    fetch("/api/my-rides", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load your rides.");
        }

        if (active) {
          setRides(data.rides || []);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not load your rides.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    fetch("/api/profile")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load profile.");
        }

        return response.json();
      })
      .then(async (data) => {
        if (!active) return;

        if (data.profile?.full_name || data.profile?.email) {
          setName(data.profile.full_name || "Rider");
          setEmail(data.profile.email || "");
          return;
        }

        const saveResponse = await fetch("/api/profile", {
          method: "POST",
        });

        const savedData = await saveResponse.json();

        if (active && saveResponse.ok && savedData.profile) {
          setName(savedData.profile.full_name || "Rider");
          setEmail(savedData.profile.email || "");
        }
      })
      .catch((err) => {
        console.error("Profile loading failed:", err);
      });

    const interval = setInterval(() => {
      void loadRides();
    }, 10000);

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const riderId = user?.id;

    if (riderId) {
      channel = supabase
        .channel(`rider-rides-${riderId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "rides",
            filter: `rider_clerk_id=eq.${riderId}`,
          },
          (payload) => {
            if (!active) return;

            const newStatus = (
              payload.new as { status?: string } | null
            )?.status;

            const oldStatus = (
              payload.old as { status?: string } | null
            )?.status;

            void loadRides();

            if (!newStatus || newStatus === oldStatus) {
              return;
            }

            switch (newStatus) {
              case "accepted":
                setNotification("🔔 A driver has accepted your ride!");
                break;
              case "in_progress":
                setNotification("🚖 Your ride has started!");
                break;
              case "completed":
                setNotification("✅ Your ride has been completed!");
                break;
              case "cancelled":
                setNotification("❌ Your ride has been cancelled.");
                break;
              default:
                setNotification("");
            }
          }
        )
        .subscribe((status) => {
          console.log("Ride realtime status:", status);
        });
    }

    return () => {
      active = false;
      clearInterval(interval);

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  function statusLabel(status: string) {
    switch (status) {
      case "requested":
        return "Waiting for a driver";
      case "accepted":
        return "Driver accepted";
      case "in_progress":
        return "Ride in progress";
      case "completed":
        return "Ride completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status.replaceAll("_", " ");
    }
  }

  function statusStyle(status: string) {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-800 ring-emerald-200";
      case "cancelled":
        return "bg-red-100 text-red-800 ring-red-200";
      case "accepted":
      case "in_progress":
        return "bg-blue-100 text-blue-800 ring-blue-200";
      default:
        return "bg-amber-100 text-amber-800 ring-amber-200";
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-2xl shadow-md shadow-blue-200">
              🚖
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-extrabold tracking-tight sm:text-xl">
                Cab Booking
              </span>
              <span className="block text-xs text-slate-500 sm:text-sm">
                Your ride, your way
              </span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Home
            </Link>
            <Link
              href="/profile"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              My Profile
            </Link>
            <Link
              href="/book-ride"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:flex-none"
            >
              + Book a Ride
            </Link>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 px-5 py-8 text-white shadow-xl shadow-blue-100 sm:px-8 sm:py-10 lg:px-10">
          <div className="pointer-events-none absolute -right-10 -top-16 -z-10 h-48 w-48 rounded-full bg-white/10 sm:h-64 sm:w-64" />
          <div className="pointer-events-none absolute -bottom-24 right-1/4 -z-10 h-48 w-48 rounded-full bg-indigo-300/20 blur-2xl" />

          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100 sm:text-sm">
            Rider Dashboard
          </p>
          <h1 className="mt-3 break-words text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Welcome, {name}!
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base sm:leading-7">
            Manage your profile, book your next journey, and keep track of your
            rides in one place.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/book-ride"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700"
            >
              Book a Ride <span className="ml-2" aria-hidden="true">→</span>
            </Link>
            <Link
              href="/profile"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Edit Profile
            </Link>
          </div>
        </section>

        {notification && (
          <div
            role="status"
            aria-live="polite"
            className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium leading-6 text-blue-900 sm:text-base"
          >
            <span className="text-lg" aria-hidden="true">🔔</span>
            <div className="min-w-0 flex-1">{notification}</div>
            <button
              type="button"
              onClick={() => setNotification("")}
              aria-label="Dismiss notification"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-blue-700 transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              ×
            </button>
          </div>
        )}

        <section className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-6">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">
                  Your journeys
                </p>
                <h2 className="mt-2 text-xl font-bold sm:text-2xl">
                  My Ride History
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Review your trips, payment status, receipts, and ratings.
                </p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-2xl">
                🧾
              </span>
            </div>
            <a
              href="#ride-history"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              View Ride History
            </a>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">
                  Account details
                </p>
                <h2 className="mt-2 text-xl font-bold sm:text-2xl">
                  My Profile
                </h2>
                <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                  <span className="font-semibold text-slate-800">Name:</span>{" "}
                  {name}
                </p>
                <p className="mt-1 break-all text-sm leading-6 text-slate-600">
                  <span className="font-semibold text-slate-800">Email:</span>{" "}
                  {email || "—"}
                </p>
              </div>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-2xl">
                👤
              </span>
            </div>
            <Link
              href="/profile"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Manage Profile
            </Link>
          </article>
        </section>

        <section
          id="ride-history"
          className="mt-6 scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mt-8"
        >
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Your activity
              </p>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                My Ride History
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Your ride status refreshes automatically.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadRides();
              }}
              disabled={loading}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <span aria-hidden="true">↻</span>
              {loading ? "Refreshing..." : "Refresh Rides"}
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {loading && (
              <div
                role="status"
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                <p className="mt-4 text-sm font-medium text-slate-600">
                  Loading your rides...
                </p>
              </div>
            )}

            {!loading && error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <p className="font-semibold">Could not load your rides.</p>
                <p className="mt-1">{error}</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    void loadRides();
                  }}
                  className="mt-3 min-h-10 rounded-lg bg-red-700 px-4 py-2 font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && rides.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
                <span className="text-5xl" aria-hidden="true">🚕</span>
                <h3 className="mt-4 text-lg font-bold">
                  No rides yet
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  Your booked rides will appear here. Book your first ride to
                  get started.
                </p>
                <Link
                  href="/book-ride"
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Book Your First Ride
                </Link>
              </div>
            )}

            {!loading && !error && rides.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800">
                  {rides.length} {rides.length === 1 ? "ride" : "rides"} total
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                  {rides.filter((ride) => ride.status === "completed").length}{" "}
                  completed
                </span>
              </div>
            )}

            {!loading && !error && rides.length > 0 && (
              <div className="space-y-5">
                {rides.map((ride) => (
                  <article
                    key={ride.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Ride ID #{ride.id}
                        </p>
                        <h3 className="mt-1 break-words text-lg font-bold">
                          {ride.ride_type}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex w-fit max-w-full items-center rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset sm:text-sm ${statusStyle(
                          ride.status
                        )}`}
                      >
                        {statusLabel(ride.status)}
                      </span>
                    </div>

                    <div className="p-4 sm:p-5">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                        <div className="flex min-w-0 gap-3">
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg">
                            ●
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Pickup location
                            </p>
                            <p className="mt-1 break-words text-sm leading-6 text-slate-800">
                              {ride.pickup_address}
                            </p>
                          </div>
                        </div>

                        <div className="flex min-w-0 gap-3">
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-lg">
                            ◆
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                              Destination
                            </p>
                            <p className="mt-1 break-words text-sm leading-6 text-slate-800">
                              {ride.destination_address}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            Estimated fare
                          </p>
                          <p className="mt-1 text-xl font-extrabold text-slate-900">
                            ₹{Number(ride.estimated_fare).toFixed(2)}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-xs font-medium text-slate-500">
                            Payment status
                          </p>
                          <p
                            className={`mt-1 text-sm font-bold capitalize ${
                              ride.payment_status === "paid"
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {ride.payment_status || "pending"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        {ride.status === "completed" && (
                          <Link
                            href={`/receipt/${ride.id}`}
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                          >
                            View / Print Receipt
                          </Link>
                        )}

                        {ride.status === "completed" &&
                          ride.payment_status !== "paid" && (
                            <button
                              type="button"
                              onClick={() => void demoPayment(ride.id)}
                              disabled={payingRideId !== null}
                              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                              {payingRideId === ride.id
                                ? "Processing..."
                                : "Try Demo Payment"}
                            </button>
                          )}
                      </div>

                      {paymentMessages[ride.id] && (
                        <p
                          role="status"
                          aria-live="polite"
                          className={`mt-4 break-words rounded-xl p-3 text-sm leading-6 ${
                            paymentMessages[ride.id].startsWith(
                              "Demo payment successful!"
                            )
                              ? "border border-blue-200 bg-blue-50 text-blue-900"
                              : "border border-red-200 bg-red-50 text-red-800"
                          }`}
                        >
                          {paymentMessages[ride.id]}
                        </p>
                      )}

                      {ride.status === "completed" && (
                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
                          <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl">
                              ⭐
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900">
                                Rate Your Driver
                              </h4>
                              <p className="mt-1 text-sm leading-6 text-slate-600">
                                How was your ride? Select a rating from 1 to 5
                                stars.
                              </p>
                            </div>
                          </div>

                          {reviewedRides[ride.id] ? (
                            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                              ★ Thank you! Your review was submitted.
                            </p>
                          ) : (
                            <>
                              <div
                                className="mt-4 flex flex-wrap gap-2"
                                role="group"
                                aria-label="Choose a star rating"
                              >
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    aria-label={`${star} star${
                                      star > 1 ? "s" : ""
                                    }`}
                                    aria-pressed={
                                      reviewRatings[ride.id] === star
                                    }
                                    onClick={() =>
                                      setReviewRatings((current) => ({
                                        ...current,
                                        [ride.id]: star,
                                      }))
                                    }
                                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-3xl transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                                      star <= (reviewRatings[ride.id] || 0)
                                        ? "bg-amber-100 text-amber-500"
                                        : "bg-white text-slate-300 hover:bg-amber-100 hover:text-amber-400"
                                    }`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>

                              <label
                                htmlFor={`review-${ride.id}`}
                                className="mt-4 block text-sm font-semibold text-slate-700"
                              >
                                Write a review (optional)
                              </label>
                              <textarea
                                id={`review-${ride.id}`}
                                value={reviewTexts[ride.id] || ""}
                                onChange={(event) =>
                                  setReviewTexts((current) => ({
                                    ...current,
                                    [ride.id]: event.target.value,
                                  }))
                                }
                                maxLength={1000}
                                placeholder="Tell us about your experience..."
                                className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                                rows={4}
                              />
                              <p className="mt-1 text-right text-xs text-slate-500">
                                {(reviewTexts[ride.id] || "").length}/1000
                                characters
                              </p>

                              <button
                                type="button"
                                onClick={() => void submitReview(ride.id)}
                                disabled={submittingReviewRideId !== null}
                                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                              >
                                {submittingReviewRideId === ride.id
                                  ? "Submitting Review..."
                                  : "Submit Review"}
                              </button>
                            </>
                          )}

                          {reviewMessages[ride.id] && (
                            <p
                              role="status"
                              aria-live="polite"
                              className={`mt-3 break-words text-sm leading-6 ${
                                reviewMessages[ride.id].includes(
                                  "successfully"
                                ) ||
                                reviewMessages[ride.id].includes("Thank you")
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {reviewMessages[ride.id]}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-5 border-t border-slate-100 pt-3">
                        <p className="text-xs leading-5 text-slate-500">
                          Booked:{" "}
                          {new Date(ride.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="py-8 text-center">
          <p className="text-xs leading-5 text-slate-500 sm:text-sm">
            Cab Booking App · Safe journeys start here.
          </p>
        </footer>
      </div>
    </main>
  );
}
