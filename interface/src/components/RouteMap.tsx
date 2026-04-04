import { useMemo, useState, useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
import { useStaticRoute } from "../hooks/useStaticRoute";
import { useDisplayFrame } from "../hooks/useDisplayFrame";

type LatLng = [number, number];

interface RouteMapProps {
  from: string;
  to: string;
  path?: LatLng[];
  expandable?: boolean;
}

const stationIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

const trainIcon = L.divIcon({
  className: "",
  html: `<div style="
    font-size:32px;
    line-height:1;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,.6));
    transform: translate(-50%,-50%);
  ">🚂</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function MapView({ path, trainPos, full }: { path: LatLng[]; trainPos: LatLng | null; full?: boolean }) {
  const center = useMemo<LatLng>(() => {
    if (trainPos) return trainPos;
    if (path.length === 0) return [48, 68];
    const s = path.reduce((a, p) => [a[0] + p[0], a[1] + p[1]] as LatLng, [0, 0] as LatLng);
    return [s[0] / path.length, s[1] / path.length];
  }, [path, trainPos]);

  return (
    <MapContainer
      key={full ? "full" : "mini"}
      className={`route-map${full ? " route-map-full" : ""}`}
      center={center}
      zoom={full ? 6 : 3.3}
      scrollWheelZoom={full}
      zoomControl={full}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={path} pathOptions={{ color: "#2563eb", weight: full ? 4 : 3 }} />
      {path.length > 0 && <Marker position={path[0]} icon={stationIcon} />}
      {path.length > 1 && <Marker position={path[path.length - 1]} icon={stationIcon} />}
      {trainPos && <Marker position={trainPos} icon={trainIcon} />}
    </MapContainer>
  );
}

export function RouteMap({ from, to, expandable }: RouteMapProps) {
  const path    = useStaticRoute();
  const frame   = useDisplayFrame();
  const [open, setOpen] = useState(false);

  const trainPos: LatLng | null =
    frame?.gps_lat && frame?.gps_lon
      ? [frame.gps_lat, frame.gps_lon]
      : null;

  useEffect(() => {
    if (trainPos) console.log("[GPS]", trainPos[0].toFixed(6), trainPos[1].toFixed(6));
  }, [trainPos]);

  useEffect(() => {
    const root = document.documentElement;
    if (open) {
      root.classList.add("map-modal-open");
    } else {
      root.classList.remove("map-modal-open");
    }
    return () => root.classList.remove("map-modal-open");
  }, [open]);

  if (path.length < 2) return (
    <div className="route-map-loading">Загрузка маршрута...</div>
  );

  return (
    <div className="route-map-wrap">
      <div className="route-map-header">
        <div className="route-map-title">{from} → {to}</div>
        {expandable && (
          <button className="route-map-open" onClick={() => setOpen(true)}>
            Открыть карту
          </button>
        )}
      </div>

      {!open && (
        <div className="route-map-frame">
          <MapView path={path} trainPos={trainPos} />
        </div>
      )}

      {expandable && open && (
        <div className="route-map-modal" onClick={() => setOpen(false)}>
          <div className="route-map-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="route-map-modal-header">
              <div className="route-map-modal-title">{from} → {to}</div>
              <button className="route-map-close" onClick={() => setOpen(false)}>Закрыть</button>
            </div>
            <MapView path={path} trainPos={trainPos} full />
          </div>
        </div>
      )}
    </div>
  );
}
