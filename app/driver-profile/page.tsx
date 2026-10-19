"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

type RatingData = {
  averageRating: number | null;
  totalReviews: number;
};

type ApiResponse = {
  averageRating?: number | null;
  totalReviews?: number;
  error?: string;
};

export default function DriverProfilePage() {
  const { user, isLoaded } = useUser();

  const [ratingData, setRatingData] = useState<RatingData>({
    averageRating: null,
    totalReviews: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const driverId = user?.id;

    if (typeof driverId !== "string" || driverId.length === 0) {
      setError("Please sign in to view your driver profile.");
      setLoading(false);
      return;
    }

    let active = true;

    const loadRating = async (): Promise<void> => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/reviews?driverId=${encodeURIComponent(driverId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data: ApiResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Could not load driver ratings."
          );
        }

        if (active) {
          setRatingData({
            averageRating:
              typeof data.averageRating === "number"
                ? data.averageRating
                : null,
            totalReviews:
              typeof data.totalReviews === "number"
                ? data.totalReviews
                : 0,
          });
        }
      } catch (err: unknown) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load driver ratings."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadRating();

    return () => {
      active = false;
    };
  }, [isLoaded, user?.id]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          &larr; Back to Home
        </Link>

        <section className="mt-6 rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            Driver Profile
          </h1>

          <p className="mt-2 break-all text-slate-600">
            {user?.fullName || "Driver"}
          </p>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-slate-900">
              Customer Ratings
            </h2>

            {loading ? (
              <p className="mt-3 text-slate-600">
                Loading ratings...
              </p>
            ) : error ? (
              <p role="alert" className="mt-3 text-red-600">
                {error}
              </p>
            ) : (
              <>
                <p className="mt-3 text-4xl font-bold text-slate-900">
                  {ratingData.averageRating === null
                    ? "—"
                    : `${ratingData.averageRating.toFixed(1)} / 5`}
                </p>

                <p
                  className="mt-2 text-2xl text-amber-500"
                  aria-label={
                    ratingData.averageRating === null
                      ? "No ratings yet"
                      : `${Math.round(ratingData.averageRating)} out of 5 stars`
                  }
                >
                  {ratingData.averageRating === null
                    ? "☆☆☆☆☆"
                    : "★".repeat(
                        Math.min(
                          5,
                          Math.max(
                            0,
                            Math.round(ratingData.averageRating)
                          )
                        )
                      ) +
                      "☆".repeat(
                        5 -
                          Math.min(
                            5,
                            Math.max(
                              0,
                              Math.round(ratingData.averageRating)
                            )
                          )
                      )}
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  {ratingData.totalReviews}{" "}
                  {ratingData.totalReviews === 1
                    ? "review"
                    : "reviews"}
                </p>

                {ratingData.totalReviews === 0 && (
                  <p className="mt-3 text-sm text-slate-600">
                    You haven't received any reviews yet.
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}