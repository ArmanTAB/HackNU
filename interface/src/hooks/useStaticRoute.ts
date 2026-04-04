import { useState, useEffect } from "react";

type LatLng = [number, number];

let cached: LatLng[] | null = null;

export function useStaticRoute(): LatLng[] {
  const [path, setPath] = useState<LatLng[]>(cached ?? []);

  useEffect(() => {
    if (cached) return;
    fetch("/almaty-astana.json")
      .then((r) => r.json())
      .then((geojson) => {
        const coords: LatLng[] = [];
        for (const feature of geojson.features ?? []) {
          const geom = feature.geometry;
          if (geom?.type === "MultiLineString") {
            for (const line of geom.coordinates) {
              for (const [lon, lat] of line) {
                coords.push([lat, lon]);
              }
            }
          } else if (geom?.type === "LineString") {
            for (const [lon, lat] of geom.coordinates) {
              coords.push([lat, lon]);
            }
          }
        }
        cached = coords;
        setPath(coords);
      });
  }, []);

  return path;
}
