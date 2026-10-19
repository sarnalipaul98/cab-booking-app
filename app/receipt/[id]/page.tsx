"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [rideId, setRideId] = useState("");
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    let active = true;

    params
      .then(({ id }) => {
        if (active) {
          setRideId(id);
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not read the ride ID.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [params]);

  useEffect(() => {
    if (!rideId) return;

    let active = true;

    async function loadReceipt() {
      try {
        const response = await fetch(
          `/api/my-rides/${encodeURIComponent(rideId)}`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load receipt.");
        }

        if (active) {
          setRide(data.ride);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load receipt."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadReceipt();

    return () => {
      active = false;
    };
  }, [rideId]);

  async function emailReceipt() {
    if (!rideId || sendingEmail) return;

    setSendingEmail(true);
    setEmailMessage("");

    try {
      const response = await fetch(
        `/api/my-rides/${encodeURIComponent(rideId)}/email-receipt`,
        { method: "POST" }
      );

      const data = await response.json();

      setEmailMessage(
        response.ok
          ? data.message || "Receipt email sent successfully."
          : data.error || "Could not send the receipt."
      );
    } catch {
      setEmailMessage(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setSendingEmail(false);
    }
  }

  if (loading) {
    return <main className="p-8">Loading receipt...</main>;
  }

  if (error || !ride) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <p className="text-red-600">
          {error || "Receipt not found."}
        </p>

        <Link
          href="/dashboard"
          className="mt-4 inline-block text-blue-600 underline"
        >
          Back to Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <article className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm sm:p-10">
        <p className="font-semibold text-blue-600">
          CAB BOOKING APP
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Ride Receipt
        </h1>

        <p className="mt-2 text-slate-500">
          Receipt for Ride #{ride.id}
        </p>

        <hr className="my-6" />

        <div className="space-y-4 text-slate-700">
          <div>
            <p className="text-sm text-slate-500">Pickup</p>
            <p className="font-medium">{ride.pickup_address}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Destination</p>
            <p className="font-medium">{ride.destination_address}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Ride type</p>
            <p className="font-medium">{ride.ride_type}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Ride date</p>
            <p className="font-medium">
              {new Date(ride.created_at).toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Ride status</p>
            <p className="font-medium capitalize">
              {ride.status.replaceAll("_", " ")}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Payment status</p>
            <p className="font-semibold capitalize">
              {ride.payment_status || "pending"}
            </p>
          </div>
        </div>

        <hr className="my-6" />

        <div className="flex items-center justify-between gap-4">
          <span className="text-lg font-semibold text-slate-900">
            Ride fare
          </span>

          <span className="text-2xl font-bold text-slate-900">
            ₹{Number(ride.estimated_fare).toFixed(2)}
          </span>
        </div>

        <p className="mt-4 text-sm text-slate-500">
          {ride.payment_status === "paid"
            ? "Demo payment recorded. No real money was collected."
            : "Payment is not recorded as paid."}
        </p>

        <div className="mt-8 flex flex-wrap gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Print Receipt
          </button>

          <button
            onClick={emailReceipt}
            disabled={sendingEmail}
            className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {sendingEmail ? "Sending..." : "Email Receipt"}
          </button>

          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>

          {emailMessage && (
            <p
              role="status"
              className="w-full text-sm text-slate-700"
            >
              {emailMessage}
            </p>
          )}
        </div>
      </article>
    </main>
  );
}