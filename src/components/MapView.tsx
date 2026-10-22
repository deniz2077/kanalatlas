"use client";

/**
 * Leaflet map. Purely presentational: it draws what the scenario engine
 * computed and reports clicks/drags back up. No calculations happen here.
 */
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  Rectangle,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { osmUrl } from "@/lib/data";
import { formatMeters } from "@/lib/insights";
import type { PointResult, SiteSuggestion } from "@/lib/scenario";
import type { Canal, Category, EvaluationPoint, Facility, HypotheticalFacility, StudyArea } from "@/lib/types";

export interface MapViewProps {
  studyArea: StudyArea;
  canals: Canal[];
  category: Category;
  facilities: Facility[];
  activeIds: Set<string>;
  points: EvaluationPoint[];
  results: Map<string, PointResult>;
  hypotheticals: HypotheticalFacility[];
  suggestions: SiteSuggestion[];
  thresholdM: number;
  placing: boolean;
  showLinks: boolean;
  onMapClick: (lat: number, lon: number) => void;
  /** Returns false when the move was rejected (e.g. outside the study area). */
  onMoveHypothetical: (id: string, lat: number, lon: number, final: boolean) => boolean;
  /** Changing this number re-frames the study area. */
  recenterToken: number;
}

const icon = (cls: string, text: string, size = 22) =>
  L.divIcon({
    className: "",
    html: `<div class="ka-marker ${cls}" style="width:${size}px;height:${size}px"><span>${text}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

const STATUS_TR: Record<string, string> = {
  MAPPED: "HARİTALANMIŞ — çalışma durumu doğrulanmadı",
  REQUIRES_CONFIRMATION: "DOĞRULAMA GEREKİYOR",
  VERIFIED: "DOĞRULANMIŞ",
  HYPOTHETICAL: "VARSAYIMSAL",
};

/**
 * Keep the study area framed when the container size changes (e.g. the map
 * mounts before the layout settles), until the user pans or zooms themselves.
 */
function FitStudyArea({ bbox, token }: { bbox: StudyArea["bbox"]; token: number }) {
  const map = useMap();
  const userMoved = useRef(false);
  useEffect(() => {
    if (token === 0) return;
    userMoved.current = false;
    map.closePopup();
    map.fitBounds(L.latLngBounds([bbox.south, bbox.west], [bbox.north, bbox.east]), { padding: [12, 12] });
  }, [token, map, bbox]);
  useEffect(() => {
    const bounds = L.latLngBounds([bbox.south, bbox.west], [bbox.north, bbox.east]);
    const fit = () => {
      map.invalidateSize();
      if (!userMoved.current) map.fitBounds(bounds, { padding: [12, 12], animate: false });
    };
    const markUser = () => (userMoved.current = true);
    fit();
    map.on("dragstart zoomstart", markUser);
    // fitBounds itself fires zoomstart; only count interactions after the first fit settles.
    map.off("zoomstart", markUser);
    const t = setTimeout(() => map.on("zoomstart", markUser), 300);
    const ro = new ResizeObserver(fit);
    ro.observe(map.getContainer());
    return () => {
      clearTimeout(t);
      ro.disconnect();
      map.off("dragstart zoomstart", markUser);
    };
  }, [map, bbox]);
  return null;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lon: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function MapView(props: MapViewProps) {
  const { studyArea, category, facilities, activeIds, points, results, hypotheticals, thresholdM } = props;
  const b = studyArea.bbox;
  const center: [number, number] = [(b.south + b.north) / 2, (b.west + b.east) / 2];

  const icons = useMemo(
    () => ({
      swim: icon("ka-marker--swim", "H"),
      park: icon("ka-marker--park", "P", 16),
      swimFaded: icon("ka-marker--swim ka-marker--faded", "h", 16),
      parkFaded: icon("ka-marker--park ka-marker--faded", "p", 12),
      excluded: icon("ka-marker--excluded", "×", 16),
      hypo: icon("ka-marker--hypo", "+", 26),
      suggest: [1, 2, 3].map((n) => icon("ka-marker--suggest", String(n), 22)),
    }),
    [],
  );

  const facilityById = useMemo(() => new Map(facilities.map((f) => [f.id, f])), [facilities]);
  const hypById = useMemo(() => new Map(hypotheticals.map((h) => [h.id, h])), [hypotheticals]);

  // Facility markers only depend on category/scope, so memoise them for smooth dragging.
  const facilityMarkers = useMemo(
    () =>
      facilities
        .filter((f) => f.category === category)
        .map((f) => {
          const active = activeIds.has(f.id);
          const ic =
            f.tier === "excluded"
              ? icons.excluded
              : active
                ? f.category === "swimming"
                  ? icons.swim
                  : icons.park
                : f.category === "swimming"
                  ? icons.swimFaded
                  : icons.parkFaded;
          return (
            <Marker key={f.id} position={[f.lat, f.lon]} icon={ic} zIndexOffset={active ? 200 : 0} keyboard={active}>
              <Popup>
                <div className="space-y-1 text-[13px] leading-snug">
                  <p className="font-semibold">{f.name ?? "İsimsiz kayıt"}</p>
                  <p>
                    <strong>Durum:</strong> {STATUS_TR[f.status]}
                  </p>
                  <p>
                    <strong>Analizde:</strong>{" "}
                    {f.tier === "excluded" ? "Hayır (hariç)" : active ? "Evet" : "Hayır (bu veri kapsamında değil)"}
                  </p>
                  <p className="text-[12px] text-slate-600">{f.tierReason}</p>
                  {f.areaM2 ? <p className="text-[12px]">Yaklaşık alan: {Math.round(f.areaM2).toLocaleString("tr-TR")} m²</p> : null}
                  <p className="text-[12px]">
                    Kaynak:{" "}
                    {f.sources.map((s, i) => (
                      <span key={s.osmId}>
                        {i > 0 && ", "}
                        <a href={osmUrl(s)} target="_blank" rel="noreferrer" className="underline">
                          OSM {s.osmType} {s.osmId}
                        </a>
                      </span>
                    ))}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        }),
    [facilities, category, activeIds, icons],
  );

  return (
    <MapContainer
      center={center}
      zoom={14}
      zoomSnap={0.25}
      minZoom={12}
      maxZoom={18}
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ cursor: props.placing ? "crosshair" : undefined }}
      aria-label="Seyhan merkez kanal koridoru etkileşimli haritası"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıcıları'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ClickHandler onClick={props.onMapClick} />
      <FitStudyArea bbox={b} token={props.recenterToken} />

      <Rectangle
        bounds={[
          [b.south, b.west],
          [b.north, b.east],
        ]}
        pathOptions={{ color: "#0f2340", weight: 2, dashArray: "6 6", fill: false, interactive: false }}
      />

      {props.canals.map((c) => (
        <Polyline
          key={c.id}
          positions={c.coords.map((p) => [p.lat, p.lon] as [number, number])}
          pathOptions={{ color: "#1d6fa5", weight: c.covered ? 3 : 5, opacity: 0.85, dashArray: c.covered ? "4 6" : undefined }}
        >
          <Tooltip sticky>
            {c.name ?? "Sulama kanalı"} · OSM way {c.source.osmId}
            {c.covered ? " (menfez/tünel olarak haritalanmış)" : " (açık kanal olarak haritalanmış)"}
          </Tooltip>
        </Polyline>
      ))}

      {/* Lines from each sampled point to its nearest facility (after the scenario). */}
      {props.showLinks &&
        points.map((p) => {
          const r = results.get(p.id);
          const target = r?.after
            ? r.after.hypothetical
              ? hypById.get(r.after.facilityId)
              : facilityById.get(r.after.facilityId)
            : undefined;
          if (!r?.after || !target) return null;
          return (
            <Polyline
              key={`link-${p.id}`}
              positions={[
                [p.lat, p.lon],
                [target.lat, target.lon],
              ]}
              pathOptions={{
                color: r.after.hypothetical ? "#b45309" : "#0f766e",
                weight: r.after.hypothetical ? 1.8 : 1,
                opacity: r.after.hypothetical ? 0.8 : 0.35,
                interactive: false,
              }}
            />
          );
        })}

      {facilityMarkers}

      {hypotheticals.map((h) => (
        <Circle
          key={`ring-${h.id}`}
          center={[h.lat, h.lon]}
          radius={thresholdM}
          pathOptions={{ color: "#b45309", weight: 1.5, dashArray: "5 5", fillColor: "#b45309", fillOpacity: 0.05, interactive: false }}
        />
      ))}

      {points.map((p) => {
        const r = results.get(p.id);
        const within = !!r?.withinAfter;
        const improved = !!r?.after?.hypothetical;
        return (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lon]}
            radius={within ? 5.5 : 4.5}
            pathOptions={{
              color: improved ? "#b45309" : within ? "#0f766e" : "#3d4f6b",
              weight: improved ? 2.5 : 1.5,
              fillColor: within ? (improved ? "#f59e0b" : "#0f766e") : "#ffffff",
              fillOpacity: within ? 0.9 : 1,
            }}
          >
            <Tooltip>
              <span className="tabular">
                <strong>Nokta {p.id}</strong>
                {p.nearLabel ? ` · ${p.nearLabel} yakını` : ""}
                <br />
                Önce: {formatMeters(r?.before?.distanceM)} · Sonra: {formatMeters(r?.after?.distanceM)}
                <br />
                {within ? `${formatMeters(thresholdM)} içinde` : `${formatMeters(thresholdM)} dışında`}
                {improved ? " · varsayımsal tesise en yakın" : ""}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {props.suggestions.map((s, i) => (
        <Marker key={`sug-${s.candidateId}`} position={[s.lat, s.lon]} icon={icons.suggest[i]} zIndexOffset={500}>
          <Tooltip>
            Öneri {i + 1}{s.nearLabel ? ` (${s.nearLabel} yakını)` : ""}: +{s.withinGained} örnek nokta eşik içine girer
          </Tooltip>
        </Marker>
      ))}

      {hypotheticals.map((h) => (
        <Marker
          key={h.id}
          position={[h.lat, h.lon]}
          icon={icons.hypo}
          draggable
          zIndexOffset={1000}
          title={`${h.label} — sürükleyerek taşıyın`}
          eventHandlers={{
            drag: (e) => {
              const ll = (e.target as L.Marker).getLatLng();
              props.onMoveHypothetical(h.id, ll.lat, ll.lng, false);
            },
            dragend: (e) => {
              const marker = e.target as L.Marker;
              const ll = marker.getLatLng();
              // Rejected drop: put the marker back where the scenario still has it.
              if (!props.onMoveHypothetical(h.id, ll.lat, ll.lng, true)) marker.setLatLng([h.lat, h.lon]);
            },
          }}
        >
          <Tooltip direction="top" offset={[0, -14]}>
            {h.label} (VARSAYIMSAL) — sürükleyin
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
