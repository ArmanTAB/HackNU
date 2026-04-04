import { useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";

type LatLng = [number, number];

interface RouteMapProps {
  path: LatLng[];
  from: string;
  to: string;
  expandable?: boolean;
}

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -32],
  shadowSize: [41, 41],
});

export function RouteMap({ path, from, to, expandable }: RouteMapProps) {
  const center = useMemo(() => {
    if (path.length === 0) return [0, 0] as LatLng;
    const sum = path.reduce(
      (acc, p) => [acc[0] + p[0], acc[1] + p[1]] as LatLng,
      [0, 0] as LatLng,
    );
    return [sum[0] / path.length, sum[1] / path.length] as LatLng;
  }, [path]);

  const [open, setOpen] = useState(false);

  if (path.length < 2) return null;

  return (
    <div className="route-map-wrap">
      <div className="route-map-header">
        <div className="route-map-title">
          Маршрут: {from} → {to}
        </div>
        {expandable && (
          <button className="route-map-open" onClick={() => setOpen(true)}>
            Открыть карту
          </button>
        )}
      </div>
      {!open && (
        <div className="route-map-frame">
          <MapContainer
            className="route-map"
            center={center}
            zoom={6}
            scrollWheelZoom={false}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Polyline
              positions={path}
              pathOptions={{ color: "#2563eb", weight: 4 }}
            />
            <Marker position={path[0]} icon={defaultIcon} />
            <Marker position={path[path.length - 1]} icon={defaultIcon} />
          </MapContainer>
        </div>
      )}
      {expandable && open && (
        <div className="route-map-modal" onClick={() => setOpen(false)}>
          <div
            className="route-map-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="route-map-modal-header">
              <div className="route-map-modal-title">
                Маршрут: {from} → {to}
              </div>
              <button
                className="route-map-close"
                onClick={() => setOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <MapContainer
              key="full"
              className="route-map route-map-full"
              center={center}
              zoom={6}
              scrollWheelZoom
              zoomControl
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Polyline
                positions={path}
                pathOptions={{ color: "#2563eb", weight: 5 }}
              />
              <Marker position={path[0]} icon={defaultIcon} />
              <Marker position={path[path.length - 1]} icon={defaultIcon} />
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
