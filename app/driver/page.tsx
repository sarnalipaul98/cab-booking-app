
"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

type Ride = {
  id: number;
  pickup_address: string;
  destination_address: string;
  ride_type: string | null;
  estimated_fare: number | string | null;
  status: string;
  driver_clerk_id: string | null;
};

export default function DriverDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();

  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const loadRides = useCallback(async () => {
    try {
      const response = await fetch("/api/driver/rides", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load rides.");
      }

      setRides(data.rides || []);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load rides."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    async function fetchRides() {
      try {
        const response = await fetch("/api/driver/rides", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load rides.");
        }

        if (!cancelled) {
          setRides(data.rides || []);
          setMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : "Unable to load rides."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchRides();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  async function acceptRide(rideId: number) {
    setUpdatingId(rideId);
    setMessage("");

    try {
      const response = await fetch(`/api/driver/rides/${rideId}/accept`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to accept this ride.");
      }

      setMessage(`Ride #${rideId} accepted successfully.`);
      await loadRides();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to accept this ride."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateRideStatus(
    rideId: number,
    status: "in_progress" | "completed"
  ) {
    setUpdatingId(rideId);
    setMessage("");

    try {
      const response = await fetch(`/api/driver/rides/${rideId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update ride status.");
      }

      setMessage(`Ride #${rideId} updated successfully.`);
      await loadRides();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update ride status."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (!isLoaded) {
    return <main className="p-6">Loading driver dashboard...</main>;
  }

  if (!isSignedIn) {
    return <main className="p-6">Please sign in to continue.</main>;
  }

  if (loading) {
    return <main className="p-6">Loading driver dashboard...</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
  <h1 className="text-3xl font-bold">Driver Dashboard</h1>
  <Link
  href="/driver-ratings"
  className="inline-block rounded-lg bg-amber-500 px-5 py-3 font-semibold text-white hover:bg-amber-600"
>
  ⭐ View Ratings
</Link>

  <Link
    href="/"
    className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 font-medium transition hover:bg-gray-100"
  >
    ← Back to Home
  </Link>
</div>

      <p className="text-gray-600">
        View ride requests and update ride progress.
      </p>

      {message && (
        <p role="status" className="rounded-lg border p-3">
          {message}
        </p>
      )}

      {rides.length === 0 && (
        <p className="rounded-xl border p-6">
          No ride requests are available right now.
        </p>
      )}

      <div className="grid gap-4">
        {rides.map((ride) => {
          const assignedToMe = ride.driver_clerk_id === user?.id;

          return (
            <article key={ride.id} className="space-y-3 rounded-xl border p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Ride #{ride.id}</h2>

                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                  {ride.status.replaceAll("_", " ")}
                </span>
              </div>

              <p>
                <strong>Pickup:</strong> {ride.pickup_address}
              </p>

              <p>
                <strong>Destination:</strong> {ride.destination_address}
              </p>

              <p>
                <strong>Ride type:</strong>{" "}
                {ride.ride_type || "Not specified"}
              </p>

              <p>
                <strong>Estimated fare:</strong>{" "}
                {ride.estimated_fare == null
                  ? "Not available"
                  : `₹${Number(ride.estimated_fare).toFixed(2)}`}
              </p>

              {ride.status === "requested" && (
                <button
                  onClick={() => void acceptRide(ride.id)}
                  disabled={updatingId !== null}
                  className="rounded-lg bg-black px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {updatingId === ride.id ? "Please wait..." : "Accept Ride"}
                </button>
              )}

              {ride.status === "accepted" && assignedToMe && (
                <button
                  onClick={() => void updateRideStatus(ride.id, "in_progress")}
                  disabled={updatingId !== null}
                  className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {updatingId === ride.id ? "Please wait..." : "Start Ride"}
                </button>
              )}

              {ride.status === "in_progress" && assignedToMe && (
                <button
                  onClick={() => void updateRideStatus(ride.id, "completed")}
                  disabled={updatingId !== null}
                  className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {updatingId === ride.id
                    ? "Please wait..."
                    : "Complete Ride"}
                </button>
              )}
            </article>
          );
        })}
      </div>

      <button
        onClick={() => {
          setLoading(true);
          void loadRides();
        }}
        disabled={loading}
        className="rounded-lg border px-5 py-3 font-medium disabled:opacity-50"
      >
        Refresh Requests
      </button>
    </main>
  );
}
