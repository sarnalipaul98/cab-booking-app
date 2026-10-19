"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";

const RideMap = dynamic(() => import("../components/RideMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-xl bg-gray-100">
      Loading map...
    </div>
  ),
});

type LocationPoint = {
  lat: number;
  lng: number;
};

export default function BookRidePage() {
  const { isLoaded, isSignedIn } = useUser();

  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [rideType, setRideType] = useState("Economy");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function findAddress(point: LocationPoint, type: "pickup" | "destination") {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${point.lat}&lon=${point.lng}`
      );
      const data = await response.json();
      const address = data.display_name || `${point.lat}, ${point.lng}`;

      if (type === "pickup") setPickupAddress(address);
      else setDestinationAddress(address);
    } catch {
      const address = `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
      if (type === "pickup") setPickupAddress(address);
      else setDestinationAddress(address);
    }
  }

  function choosePickup(point: LocationPoint) {
    setPickup(point);
    void findAddress(point, "pickup");
  }

  function chooseDestination(point: LocationPoint) {
    setDestination(point);
    void findAddress(point, "destination");
  }

  async function submitRide(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!isSignedIn) {
      setMessage("Please sign in before booking a ride.");
      return;
    }

    if (!pickup || !destination || !pickupAddress || !destinationAddress) {
      setMessage("Select both locations on the map and wait for their addresses.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup_address: pickupAddress,
          pickup_latitude: pickup.lat,
          pickup_longitude: pickup.lng,
          destination_address: destinationAddress,
          destination_latitude: destination.lat,
          destination_longitude: destination.lng,
          ride_type: rideType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not request your ride.");
      }

      setMessage("Ride requested successfully!");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) return <p className="p-6">Loading...</p>;

  if (!isSignedIn) {
    return <p className="p-6">Please sign in to book a ride.</p>;
  }

  return (
    
      <main className="w-full px-4 py-6 sm:px-6">
  <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Book a Ride</h1>
      <p className="text-gray-600">
        Click the map once for pickup and again for your destination.
      </p>

      <RideMap
        pickup={pickup}
        destination={destination}
        onPickupChange={choosePickup}
        onDestinationChange={chooseDestination}
      />

      <form onSubmit={submitRide} className="space-y-5 rounded-xl border p-6">
        <div>
          <label className="mb-1 block font-medium">Pickup address</label>
          <input
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            required
            className="w-full rounded-lg border p-3"
            placeholder="Select on the map or edit address"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">Destination address</label>
          <input
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            required
            className="w-full rounded-lg border p-3"
            placeholder="Select on the map or edit address"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium">Ride type</label>
          <select
            value={rideType}
            onChange={(e) => setRideType(e.target.value)}
            className="w-full rounded-lg border p-3"
          >
            <option value="Economy">Economy</option>
            <option value="Sedan">Sedan</option>
            <option value="SUV">SUV</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-black p-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Requesting..." : "Request Ride"}
        </button>

        {message && (
          <p role="status" className="text-sm font-medium">
            {message}
          </p>
        )}
      </form>
      </div>
    </main>
  );
}
