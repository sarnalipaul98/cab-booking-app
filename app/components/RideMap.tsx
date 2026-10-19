"use client";

import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LocationPoint = {
  lat: number;
  lng: number;
};

type RideMapProps = {
  pickup: LocationPoint | null;
  destination: LocationPoint | null;
  onPickupChange: (point: LocationPoint) => void;
  onDestinationChange: (point: LocationPoint) => void;
};

const pickupIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapClickHandler({
  onPickupChange,
  onDestinationChange,
}: Pick<RideMapProps, "onPickupChange" | "onDestinationChange">) {
  const [selecting, setSelecting] = useState<"pickup" | "destination">(
    "pickup"
  );

  useMapEvents({
    click(event) {
      const point = {
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      };

      if (selecting === "pickup") {
        onPickupChange(point);
        setSelecting("destination");
      } else {
        onDestinationChange(point);
        setSelecting("pickup");
      }
    },
  });

  return (
    <div className="absolute left-3 top-3 z-[1000] rounded-lg bg-white p-3 text-sm shadow">
      Click the map to select:{" "}
      <strong>
        {selecting === "pickup" ? "Pickup" : "Destination"}
      </strong>
    </div>
  );
}

export default function RideMap({
  pickup,
  destination,
  onPickupChange,
  onDestinationChange,
}: RideMapProps) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <MapContainer
        center={[17.385, 78.4867]}
        zoom={12}
        scrollWheelZoom
        className="h-[400px] w-full rounded-xl"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} />
        )}

        {destination && (
          <Marker
            position={[destination.lat, destination.lng]}
            icon={pickupIcon}
          />
        )}

        <MapClickHandler
          onPickupChange={onPickupChange}
          onDestinationChange={onDestinationChange}
        />
      </MapContainer>
    </div>
  );
}


