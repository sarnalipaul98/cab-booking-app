
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Ride = {
  id: number;
  pickup_address: string;
  destination_address: string;
  ride_type: string;
  estimated_fare: number | string;
  status: string;
  payment_status?: string | null;
  created_at: string;
};

type RiderReview = {
  ride_id: number;
  rating: number;
  review: string | null;
  created_at: string;
};

export default function DriverRidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRideId, setSelectedRideId] = useState<number | null>(null);
  const [reviews, setReviews] = useState<Record<number, RiderReview | null>>(
    {}
  );
  const [reviewLoadingId, setReviewLoadingId] = useState<number | null>(null);
  const [reviewErrors, setReviewErrors] = useState<Record<number, string>>({});

  const loadRides = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/driver-rides", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load rides.");
      }

      setRides(data.rides ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load rides."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRides();
  }, [loadRides]);

  async function viewRiderReview(rideId: number) {
    if (selectedRideId === rideId) {
      setSelectedRideId(null);
      return;
    }

    setSelectedRideId(rideId);
    setReviewErrors((previous) => ({ ...previous, [rideId]: "" }));

    if (Object.prototype.hasOwnProperty.call(reviews, rideId)) {
      return;
    }

    setReviewLoadingId(rideId);

    try {
      const response = await fetch(
        `/api/driver-rides/review?rideId=${rideId}`,
        { cache: "no-store" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load rider rating.");
      }

      setReviews((previous) => ({
        ...previous,
        [rideId]: data.review ?? null,
      }));
    } catch (err) {
      setReviewErrors((previous) => ({
        ...previous,
        [rideId]:
          err instanceof Error ? err.message : "Could not load rider rating.",
      }));
    } finally {
      setReviewLoadingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Driver Ride History
            </h1>
            <p className="mt-2 text-slate-600">
              View rides assigned to your driver account.
            </p>
          </div>

          <button
            onClick={() => void loadRides()}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mt-6">
          {loading ? (
            <p className="rounded-xl bg-white p-5">Loading rides...</p>
          ) : error ? (
            <div className="rounded-xl bg-white p-5">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => void loadRides()}
                className="mt-3 text-blue-600 underline"
              >
                Try again
              </button>
            </div>
          ) : rides.length === 0 ? (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="font-semibold text-slate-900">
                No rides assigned yet.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Assigned rides will appear here automatically when they are
                linked to your driver account.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rides.map((ride) => (
                <article
                  key={ride.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      Ride #{ride.id}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm capitalize">
                      {ride.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-slate-500">Pickup</p>
                  <p className="font-medium text-slate-800">
                    {ride.pickup_address}
                  </p>

                  <p className="mt-3 text-sm text-slate-500">Destination</p>
                  <p className="font-medium text-slate-800">
                    {ride.destination_address}
                  </p>

                  <div className="mt-4 flex flex-wrap justify-between gap-3 border-t pt-4">
                    <p className="text-sm text-slate-600">
                      {ride.ride_type} ·{" "}
                      {new Date(ride.created_at).toLocaleString()}
                    </p>
                    <p className="font-bold text-slate-900">
                      ₹{Number(ride.estimated_fare).toFixed(2)}
                    </p>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    Payment: {ride.payment_status || "pending"}
                  </p>

                  <button
                    type="button"
                    onClick={() => void viewRiderReview(ride.id)}
                    className="mt-4 rounded-xl border border-blue-600 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    {selectedRideId === ride.id
                      ? "Hide Rider Rating"
                      : "View Rider Rating"}
                  </button>

                  {selectedRideId === ride.id && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-4">
                      {reviewLoadingId === ride.id ? (
                        <p className="text-sm text-slate-600">
                          Loading rider rating...
                        </p>
                      ) : reviewErrors[ride.id] ? (
                        <div>
                          <p className="text-sm text-red-600">
                            {reviewErrors[ride.id]}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setReviews((previous) => {
                                const next = { ...previous };
                                delete next[ride.id];
                                return next;
                              });
                              void viewRiderReview(ride.id);
                            }}
                            className="mt-2 text-sm text-blue-700 underline"
                          >
                            Try again
                          </button>
                        </div>
                      ) : !Object.prototype.hasOwnProperty.call(
                          reviews,
                          ride.id
                        ) ? (
                        <p className="text-sm text-slate-600">
                          Preparing review...
                        </p>
                      ) : reviews[ride.id] === null ? (
                        <p className="text-sm text-slate-600">
                          The rider has not submitted a rating for this ride
                          yet.
                        </p>
                      ) : (
                        <>
                          <p className="font-semibold text-slate-900">
                            Rider Rating: {reviews[ride.id]?.rating}/5{" "}
                            <span className="text-amber-500">
                              {"★".repeat(reviews[ride.id]?.rating ?? 0)}
                            </span>
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-700">
                            Review
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-slate-600">
                            {reviews[ride.id]?.review || "No written comment."}
                          </p>
                          <p className="mt-3 text-xs text-slate-500">
                            Submitted:{" "}
                            {reviews[ride.id]?.created_at
                              ? new Date(
                                  reviews[ride.id]!.created_at
                                ).toLocaleString()
                              : "Date unavailable"}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/dashboard"
          className="mt-6 inline-block text-blue-600 underline"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
