"use client";

import { useEffect, useRef, useState } from "react";
import {
  importLibrary,
  setOptions,
} from "@googlemaps/js-api-loader";
import { supabase } from "@/lib/supabase";
type GPSPoint = {
  lat: number;
  lng: number;
};
type SavedTerritory = {
  id: string;

  owner_id: string;

  points: GPSPoint[];

  area_m2: number;

  route_distance_m: number;

  closing_distance_m: number;

  created_at: string;

  profiles: {
    username: string;
    player_color: string;
  } | null;
};
function calculateDistanceMeters(
  pointA: GPSPoint,
  pointB: GPSPoint
) {
  const earthRadius = 6371000;

  const lat1 = (pointA.lat * Math.PI) / 180;
  const lat2 = (pointB.lat * Math.PI) / 180;

  const deltaLat =
    ((pointB.lat - pointA.lat) * Math.PI) / 180;

  const deltaLng =
    ((pointB.lng - pointA.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) *
      Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;
}

function calculateRouteDistance(
  points: GPSPoint[]
) {
  let total = 0;

  for (let i = 1; i < points.length; i++) {
    total += calculateDistanceMeters(
      points[i - 1],
      points[i]
    );
  }

  return total;
}

function calculatePolygonArea(
  points: GPSPoint[]
) {
  if (points.length < 3) {
    return 0;
  }

  const earthRadius = 6371000;

  const averageLat =
    points.reduce(
      (sum, point) => sum + point.lat,
      0
    ) / points.length;

  const latReference =
    (averageLat * Math.PI) / 180;

  const projectedPoints = points.map(
    (point) => {
      const x =
        earthRadius *
        ((point.lng * Math.PI) / 180) *
        Math.cos(latReference);

      const y =
        earthRadius *
        ((point.lat * Math.PI) / 180);

      return { x, y };
    }
  );

  let area = 0;

  for (
    let i = 0;
    i < projectedPoints.length;
    i++
  ) {
    const current =
      projectedPoints[i];

    const next =
      projectedPoints[
        (i + 1) % projectedPoints.length
      ];

    area +=
      current.x * next.y -
      next.x * current.y;
  }

  return Math.abs(area / 2);
}
const MIN_ROUTE_DISTANCE = 40;
const MAX_ROUTE_DISTANCE = 1500;

const MAX_DISTANCE_FROM_START = 20;

const MIN_CAPTURE_POINTS = 5;

const MIN_AREA = 50;
const MAX_AREA = 100000;
export default function GameMap() {
  async function saveTerritory(
  points: GPSPoint[],
  area: number,
  routeDistance: number,
  closingDistance: number
) {
  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    setMessage(
      "You must be logged in to save territory."
    );

    return false;
  }

  const {
    data,
    error,
  } = await supabase
    .from("territories")
    .insert({
      owner_id: user.id,

      points,

      area_m2: area,

      route_distance_m:
        routeDistance,

      closing_distance_m:
        closingDistance,
    })
    .select()
    .single();

  if (error) {
    console.error(
      "Territory save failed:",
      error
    );

    setMessage(
      "Territory captured, but saving failed."
    );

    return false;
  }

  console.log(
    "Saved territory:",
    data
  );

  return true;
}
  
async function loadTerritories() {
  if (!googleMapRef.current) {
    return;
  }

  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const {
    data,
    error,
  } = await supabase
    .from("territories")
    .select(`
      id,
      owner_id,
      points,
      area_m2,
      route_distance_m,
      closing_distance_m,
      created_at,
      profiles!territories_owner_profile_fkey (
        username,
        player_color
      )
    `)
    .order(
      "created_at",
      {
        ascending: true,
      }
    );

  if (error) {
    console.error(
      "Unable to load territories:",
      error
    );

    return;
  }

  const territories =
    data as unknown as SavedTerritory[];

  console.log(
    "All territories:",
    territories
  );

  // Remove polygons already on screen
  territoryPolygonsRef.current.forEach(
    (polygon) => {
      polygon.setMap(null);
    }
  );

  territoryPolygonsRef.current = [];

  territories.forEach(
  (territory) => {
    const color =
      territory.profiles
        ?.player_color ||
      "#64748B";

    const username =
      territory.profiles
        ?.username ||
      "Unknown Player";

    const polygon =
      new google.maps.Polygon({
        paths:
          territory.points,

        strokeColor: color,

        strokeOpacity:
          1,

        strokeWeight:
          3,

        fillColor:
          color,

        fillOpacity:
          0.3,

        map:
          googleMapRef.current,
      });

    polygon.addListener(
      "click",
      () => {
        setMessage(
          `👑 ${username} owns ${Math.round(
            territory.area_m2
          )} m²`
        );
      }
    );

    territoryPolygonsRef.current.push(
      polygon
    );
  }
);
}
  const mapRef = useRef<HTMLDivElement | null>(null);

  const googleMapRef =
    useRef<google.maps.Map | null>(null);

  const playerMarkerRef =
    useRef<google.maps.marker.AdvancedMarkerElement | null>(
      null
    );

  // Line showing the player's walking route
  const captureLineRef =
    useRef<google.maps.Polyline | null>(null);

  // Polygon shown after capture stops
  const territoryPolygonsRef =
    useRef<google.maps.Polygon[]>([]);

  const watchIdRef =
    useRef<number | null>(null);

  const firstLocationRef =
    useRef(true);

  // Important: refs give GPS callback the latest capture state
  const capturingRef =
    useRef(false);

  const capturePointsRef =
    useRef<GPSPoint[]>([]);

  const [capturing, setCapturing] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);

  const [pointCount, setPointCount] =
    useState(0);

  const [message, setMessage] =
    useState("");
  const [routeDistance, setRouteDistance] =
  useState(0);

const [distanceFromStart, setDistanceFromStart] =
  useState<number | null>(null);

  useEffect(() => {
    async function initializeMap() {
      const apiKey =
        process.env
          .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        setLocationError(
          "Google Maps API key is missing."
        );

        return;
      }

      setOptions({
        key: apiKey,
        v: "weekly",
      });

      const { Map } =
        (await importLibrary(
          "maps"
        )) as google.maps.MapsLibrary;

      await importLibrary("marker");

      if (!mapRef.current) return;

      // Default Sydney location before GPS loads
      const defaultPosition = {
        lat: -33.8688,
        lng: 151.2093,
      };

      const map = new Map(
        mapRef.current,
        {
          center: defaultPosition,
          zoom: 16,

          mapId: "DEMO_MAP_ID",

          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }
      );

      googleMapRef.current = map;

      await loadTerritories();

      startLocationTracking();
    }

    initializeMap();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
      }
    };
  }, []);

  function startLocationTracking() {
    if (!navigator.geolocation) {
      setLocationError(
        "Your browser does not support GPS."
      );

      return;
    }

    watchIdRef.current =
      navigator.geolocation.watchPosition(
        handleLocationSuccess,
        handleLocationError,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
  }

  async function handleLocationSuccess(
    position: GeolocationPosition
  ) {
    const latitude =
      position.coords.latitude;

    const longitude =
      position.coords.longitude;

    const accuracy =
      position.coords.accuracy;

    console.log({
      latitude,
      longitude,
      accuracy,
    });

    const currentPosition: GPSPoint = {
      lat: latitude,
      lng: longitude,
    };

    setLocation({
      latitude,
      longitude,
      accuracy,
    });

    setLocationError("");

    if (!googleMapRef.current) return;

    // Move map to player on first GPS reading
    if (firstLocationRef.current) {
      googleMapRef.current.setCenter(
        currentPosition
      );

      googleMapRef.current.setZoom(18);

      firstLocationRef.current = false;
    }

    // Create player marker
    if (!playerMarkerRef.current) {
      const {
        AdvancedMarkerElement,
      } =
        (await google.maps.importLibrary(
          "marker"
        )) as google.maps.MarkerLibrary;

      const playerElement =
        document.createElement("div");

      playerElement.innerHTML = `
        <div style="
          width: 24px;
          height: 24px;
          background: #2563eb;
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 5px rgba(37,99,235,0.25);
        "></div>
      `;

      playerMarkerRef.current =
        new AdvancedMarkerElement({
          position: currentPosition,
          map: googleMapRef.current,
          title: "You",
          content: playerElement,
        });
    } else {
      playerMarkerRef.current.position =
        currentPosition;
    }

    // ==================================
    // CAPTURE SYSTEM
    // ==================================

    if (capturingRef.current) {
  // Ignore bad GPS readings
  if (accuracy > 50) {
    console.log(
      "GPS point ignored because accuracy is:",
      accuracy
    );

    return;
  }

  const points =
    capturePointsRef.current;

  const lastPoint =
    points[points.length - 1];

  // Prevent adding duplicate/jitter points
  if (lastPoint) {
    const distanceFromLastPoint =
      calculateDistanceMeters(
        lastPoint,
        currentPosition
      );

    // Ignore movement smaller than 3 metres
    if (distanceFromLastPoint < 3) {
      return;
    }
  }

  capturePointsRef.current.push(
    currentPosition
  );

  const updatedPoints =
    capturePointsRef.current;

  setPointCount(
    updatedPoints.length
  );

  // Total route distance
  const distance =
    calculateRouteDistance(
      updatedPoints
    );

  setRouteDistance(distance);

  // Distance from starting point
  const startPoint =
    updatedPoints[0];

  const fromStart =
    calculateDistanceMeters(
      startPoint,
      currentPosition
    );

  setDistanceFromStart(
    fromStart
  );

  if (captureLineRef.current) {
    captureLineRef.current
      .getPath()
      .push(
        new google.maps.LatLng(
          latitude,
          longitude
        )
      );
  }

  // Auto warning if route is too long
  if (
    distance >
    MAX_ROUTE_DISTANCE
  ) {
    setMessage(
      "Capture is too large. Return to your starting point."
    );
  }
}

  }

  function handleLocationError(
    error: GeolocationPositionError
  ) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setLocationError(
          "Location permission denied. Please allow location access."
        );
        break;

      case error.POSITION_UNAVAILABLE:
        setLocationError(
          "Your location is unavailable."
        );
        break;

      case error.TIMEOUT:
        setLocationError(
          "Getting your location took too long."
        );
        break;

      default:
        setLocationError(
          "Unable to get your location."
        );
    }
  }

  // ==================================
  // START CAPTURE
  // ==================================

  function startCapture() {
    if (!location) {
      setMessage(
        "Waiting for your GPS location..."
      );

      return;
    }

    if (!googleMapRef.current) return;

    setMessage("");

    // Remove previous walking line
   if (captureLineRef.current) {
      captureLineRef.current.setMap(null);
    }

    // Remove previous polygon(s)
    territoryPolygonsRef.current.forEach(
      (polygon) => {
        polygon.setMap(null);
      }
    );
    territoryPolygonsRef.current = [];

    const startingPoint = {
      lat: location.latitude,
      lng: location.longitude,
    };

    // Clear old points
    capturePointsRef.current = [
      startingPoint,
    ];

    setPointCount(1);
    setRouteDistance(0);
    setDistanceFromStart(0);

    capturingRef.current = true;
    setCapturing(true);

    // Create new walking line
    captureLineRef.current =
      new google.maps.Polyline({
        path: [startingPoint],

        geodesic: true,

        strokeColor: "#2563EB",

        strokeOpacity: 1,

        strokeWeight: 5,

        map: googleMapRef.current,
      });

    setMessage(
      "Capture started. Walk around the area."
    );
  }

  // ==================================
  // STOP CAPTURE
  // ==================================

  async function stopCapture() {
  const points =
    capturePointsRef.current;

  if (!googleMapRef.current) {
    return;
  }

  // ------------------------------
  // RULE 1
  // Enough GPS points?
  // ------------------------------

  if (
    points.length <
    MIN_CAPTURE_POINTS
  ) {
    setMessage(
      `Keep walking. You need at least ${MIN_CAPTURE_POINTS} GPS points.`
    );

    return;
  }

  // ------------------------------
  // RULE 2
  // Enough walking distance?
  // ------------------------------

  const totalDistance =
    calculateRouteDistance(points);

  if (
    totalDistance <
    MIN_ROUTE_DISTANCE
  ) {
    setMessage(
      `Walk at least ${MIN_ROUTE_DISTANCE} metres before completing a capture.`
    );

    return;
  }

  // ------------------------------
  // RULE 3
  // Route too long?
  // ------------------------------

  if (
    totalDistance >
    MAX_ROUTE_DISTANCE
  ) {
    setMessage(
      "This capture route is too large."
    );

    return;
  }

  // ------------------------------
  // RULE 4
  // Did player return near start?
  // ------------------------------

  const startPoint =
    points[0];

  const endPoint =
    points[
      points.length - 1
    ];

  const closingDistance =
    calculateDistanceMeters(
      startPoint,
      endPoint
    );

  if (
    closingDistance >
    MAX_DISTANCE_FROM_START
  ) {
    setMessage(
      `Return closer to your starting point. You are ${Math.round(
        closingDistance
      )} metres away.`
    );

    return;
  }
const [playerColor, setPlayerColor] =
  useState("#2563EB");
  async function loadPlayerProfile() {
  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .select(
      "username, player_color"
    )
    .eq(
      "id",
      user.id
    )
    .single();

  if (error) {
    console.error(
      "Unable to load profile:",
      error
    );

    return;
  }

  setPlayerColor(
    data.player_color
  );
}
  // ------------------------------
  // RULE 5
  // Calculate captured area
  // ------------------------------

  const area =
    calculatePolygonArea(
      points
    );

  if (area < MIN_AREA) {
    setMessage(
      `Captured area is too small. Minimum is ${MIN_AREA} m².`
    );

    return;
  }

  if (area > MAX_AREA) {
    setMessage(
      "Captured territory is too large."
    );

    return;
  }

  // ------------------------------
  // ALL RULES PASSED
  // ------------------------------

  capturingRef.current =
    false;

  setCapturing(false);

  const closedPath = [
    ...points,
    points[0],
  ];

  if (
    captureLineRef.current
  ) {
    captureLineRef.current.setPath(
      closedPath
    );
  }

  territoryPolygonsRef.current.forEach(
    (polygon) => {
      polygon.setMap(null);
    }
  );

setMessage(
  "Saving territory..."
);

const saved =
  await saveTerritory(
    points,
    area,
    totalDistance,
    closingDistance
  );

if (!saved) {
  capturingRef.current = true;

  setCapturing(true);

  return;
}
  console.log({
    points,
    routeDistance:
      totalDistance,
    closingDistance,
    area,
  });
}

  // ==================================
  // CANCEL
  // ==================================

  function cancelCapture() {
    capturingRef.current = false;

    setCapturing(false);

    capturePointsRef.current = [];

    setPointCount(0);

    if (captureLineRef.current) {
      captureLineRef.current.setMap(null);

      captureLineRef.current = null;
    }

    setMessage(
      "Capture cancelled."
    );
  }

  function centreOnPlayer() {
    if (
      !location ||
      !googleMapRef.current
    ) {
      return;
    }

    googleMapRef.current.panTo({
      lat: location.latitude,
      lng: location.longitude,
    });

    googleMapRef.current.setZoom(18);
  }

  return (
    <div className="relative w-full h-full">

      {/* GOOGLE MAP */}

      <div
        ref={mapRef}
        className="w-full h-full"
      />

      {/* GPS STATUS */}

      {location && (
        <div className="absolute top-4 left-4 bg-white text-black px-4 py-3 rounded-xl shadow-lg text-sm z-10">
          <p className="font-bold">
            📍 Live Location
          </p>

          <p>
            Accuracy:{" "}
            {Math.round(
              location.accuracy
            )}{" "}
            m
          </p>

          {capturing && (
            <p className="mt-1 text-blue-600 font-semibold">
              🔴 Capturing
            </p>
          )}

  {capturing && (
  <>
    <p className="mt-1 text-blue-600 font-semibold">
      🔴 Capturing
    </p>

    <p>
      GPS points: {pointCount}
    </p>

    <p>
      Distance:{" "}
      {Math.round(
        routeDistance
      )}{" "}
      m
    </p>

    {distanceFromStart !==
      null && (
      <p>
        From start:{" "}
        {Math.round(
          distanceFromStart
        )}{" "}
        m
      </p>
    )}
  </>
)}

        </div>
      )}

      {/* ERROR */}

      {locationError && (
        <div className="absolute top-4 left-4 right-4 bg-red-600 text-white p-4 rounded-xl shadow-lg z-20">
          {locationError}
        </div>
      )}

      {/* MESSAGE */}

      {message && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg z-20">
          {message}
        </div>
      )}

      {/* CENTRE LOCATION */}

      <button
        onClick={centreOnPlayer}
        className="absolute bottom-28 right-5 bg-white text-black w-14 h-14 rounded-full shadow-xl text-2xl z-10"
        title="Centre on me"
      >
        ◎
      </button>

      {/* CAPTURE CONTROLS */}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">

        {!capturing ? (
          <button
            onClick={startCapture}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-full shadow-xl"
          >
            ▶ Start Capture
          </button>
        ) : (
          <div className="flex gap-3">

            <button
              onClick={cancelCapture}
              className="bg-slate-800 text-white font-semibold px-5 py-4 rounded-full shadow-xl"
            >
              Cancel
            </button>

            <button
              onClick={stopCapture}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-7 py-4 rounded-full shadow-xl"
            >
              ■ Stop Capture
            </button>

          </div>
        )}

      </div>

    </div>
  );
}





