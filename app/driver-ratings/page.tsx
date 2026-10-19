
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

type Review = {
  ride_id: number;
  rating: number;
  review: string | null;
  created_at: string;
};

export default function DriverRatingsPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadRatings() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/driver-ratings?driverId=${encodeURIComponent(user!.id)}`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load ratings.");
        }

        if (!cancelled) {
          setReviews(data.reviews ?? []);
          setAverageRating(data.averageRating ?? null);
          setTotalReviews(data.totalReviews ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load ratings."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRatings();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user?.id]);

  if (!isLoaded || loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        Loading driver ratings...
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        Please sign in to view ratings.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/dashboard"
          className="inline-block text-blue-700 underline"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="mt-5 text-3xl font-bold text-slate-900">
          Rider Ratings & Reviews
        </h1>
        <p className="mt-2 text-slate-600">
          See the ratings and feedback riders have given you.
        </p>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {!error && (
          <>
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">Your average rating</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {averageRating === null ? "Not rated yet" : `${averageRating} / 5`}
                {averageRating !== null && (
                  <span className="ml-2 text-amber-500">
                    {"★".repeat(Math.round(averageRating))}
                  </span>
                )}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
              </p>
            </section>

            <h2 className="mt-8 text-xl font-bold text-slate-900">
              Rider Feedback
            </h2>

            {reviews.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
                No rider reviews have been submitted yet.
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {reviews.map((item) => (
                  <article
                    key={item.ride_id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-slate-900">
                        Ride #{item.ride_id}
                      </h3>
                      <span className="font-semibold text-amber-500">
                        {"★".repeat(item.rating)}
                        {"☆".repeat(5 - item.rating)}
                        <span className="ml-2 text-slate-700">
                          {item.rating}/5
                        </span>
                      </span>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-slate-700">
                      {item.review || "No written comment."}
                    </p>

                    <p className="mt-3 text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
