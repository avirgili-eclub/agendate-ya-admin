import { useEffect, useRef, type MutableRefObject } from "react";
import L, { type LatLngExpression, type LeafletMouseEvent, type Map as LeafletMap, type Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { Button } from "@/shared/ui/button";

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export type LocationCoordinates = {
  latitude: number;
  longitude: number;
};

const ASUNCION_CENTER: LocationCoordinates = {
  latitude: -25.2637,
  longitude: -57.5759,
};

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function toLatLngExpression(coordinates: LocationCoordinates): LatLngExpression {
  return [coordinates.latitude, coordinates.longitude];
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(6));
}

function normalizeCoordinates(latitude: number, longitude: number): LocationCoordinates {
  return {
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
  };
}

function updateMarker(
  map: LeafletMap,
  markerRef: MutableRefObject<Marker | null>,
  value: LocationCoordinates | null,
  draggable: boolean,
  onChangeRef?: MutableRefObject<((value: LocationCoordinates) => void) | undefined>,
) {
  if (!value) {
    markerRef.current?.remove();
    markerRef.current = null;
    return;
  }

  const position = toLatLngExpression(value);

  if (!markerRef.current) {
    const marker = L.marker(position, {
      draggable,
      autoPan: draggable,
    }).addTo(map);

    if (draggable && onChangeRef) {
      marker.on("dragend", () => {
        const nextPosition = marker.getLatLng();
        onChangeRef.current?.(normalizeCoordinates(nextPosition.lat, nextPosition.lng));
      });
    }

    markerRef.current = marker;
    return;
  }

  markerRef.current.setLatLng(position);
}

type LocationMapPickerProps = {
  value: LocationCoordinates | null;
  onChange: (value: LocationCoordinates) => void;
  onClear: () => void;
};

export function LocationMapPicker({ value, onChange, onClear }: LocationMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const initialCenter = value ?? ASUNCION_CENTER;
    const map = L.map(containerRef.current, {
      center: toLatLngExpression(initialCenter),
      zoom: value ? 16 : 13,
      scrollWheelZoom: true,
    });

    L.tileLayer(OSM_TILE_URL, {
      maxZoom: 19,
      attribution: OSM_ATTRIBUTION,
    }).addTo(map);

    map.on("click", (event: LeafletMouseEvent) => {
      onChangeRef.current(normalizeCoordinates(event.latlng.lat, event.latlng.lng));
    });

    mapRef.current = map;
    updateMarker(map, markerRef, value, true, onChangeRef);

    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    updateMarker(map, markerRef, value, true, onChangeRef);
    if (value) {
      map.panTo(toLatLngExpression(value));
    }
  }, [value]);

  return (
    <div className="rounded-lg border border-neutral-dark p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-primary">Ubicación en mapa</h3>
          <p className="mt-1 text-xs text-primary-light">
            Opcional. Hacé click en el mapa o arrastrá el marcador para ubicar la sede.
          </p>
        </div>
        {value && (
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            Quitar ubicación
          </Button>
        )}
      </div>

      <div
        ref={containerRef}
        className="mt-3 h-56 overflow-hidden rounded-md border border-neutral-dark"
        aria-label="Mapa para seleccionar ubicación de la sede"
      />

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="location-latitude" className="block text-xs font-medium text-primary">
            Latitud
          </label>
          <input
            id="location-latitude"
            type="number"
            value={value?.latitude ?? ""}
            readOnly
            className="mt-1 h-10 w-full rounded-md border border-neutral-dark bg-neutral px-3 text-sm text-primary outline-none"
            placeholder="-25.263700"
          />
        </div>
        <div>
          <label htmlFor="location-longitude" className="block text-xs font-medium text-primary">
            Longitud
          </label>
          <input
            id="location-longitude"
            type="number"
            value={value?.longitude ?? ""}
            readOnly
            className="mt-1 h-10 w-full rounded-md border border-neutral-dark bg-neutral px-3 text-sm text-primary outline-none"
            placeholder="-57.575900"
          />
        </div>
      </div>
    </div>
  );
}

type LocationMapPreviewProps = {
  value: LocationCoordinates;
};

export function LocationMapPreview({ value }: LocationMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center: toLatLngExpression(value),
      zoom: 16,
      scrollWheelZoom: false,
    });

    L.tileLayer(OSM_TILE_URL, {
      maxZoom: 19,
      attribution: OSM_ATTRIBUTION,
    }).addTo(map);

    mapRef.current = map;
    updateMarker(map, markerRef, value, false);

    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      markerRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    updateMarker(map, markerRef, value, false);
    map.setView(toLatLngExpression(value), map.getZoom());
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="h-48 overflow-hidden rounded-md border border-neutral-dark"
      aria-label="Mapa con ubicación de la sede"
    />
  );
}
