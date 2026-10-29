import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";
import type { SpecimenSummary } from "../../api/types";
import { HEALTH } from "../../lib/health";
import { useUi } from "../../store/ui";

interface SpecimenMapProps {
  specimens: SpecimenSummary[];
}

const BOGOTA: [number, number] = [4.65, -74.08];

function FitBounds({ specimens }: SpecimenMapProps) {
  const map = useMap();
  const key = specimens.map((s) => s.id).join(",");
  useEffect(() => {
    if (specimens.length === 0) return;
    map.fitBounds(latLngBounds(specimens.map((s) => [s.lat, s.lng])), { padding: [24, 24], maxZoom: 17 });
    // Refit only when the visible set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export function SpecimenMap({ specimens }: SpecimenMapProps) {
  const openSpecimen = useUi((s) => s.openSpecimen);
  return (
    <MapContainer center={BOGOTA} zoom={12} className="h-[360px] w-full" scrollWheelZoom={false}>
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
        maxZoom={16}
      />
      <FitBounds specimens={specimens} />
      {specimens.map((s) => (
        <CircleMarker
          key={s.id}
          center={[s.lat, s.lng]}
          radius={Math.max(3, Math.min(12, s.crown_m * 0.6))}
          pathOptions={{ color: HEALTH[s.health].color, fillColor: HEALTH[s.health].color, fillOpacity: 0.55, weight: 1 }}
          eventHandlers={{ click: () => openSpecimen(s.id) }}
        >
          <Tooltip className="canopy-tooltip">
            {s.tag} · {s.common_name} · {HEALTH[s.health].label}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
