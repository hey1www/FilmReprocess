import { useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { AssetLocation } from "../../types/models";
import { useI18n } from "../../features/i18n/I18nProvider";
import { searchPlaces, type PlaceSearchResult } from "../../services/mapSearch";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function DraggableMarker({
  value,
  onChange,
}: {
  value: AssetLocation;
  onChange: (location: AssetLocation) => void;
}) {
  useMapEvents({
    click(event) {
      onChange({
        ...value,
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return (
    <Marker
      draggable
      position={[value.lat, value.lng]}
      eventHandlers={{
        dragend(event) {
          const marker = event.target as L.Marker;
          const position = marker.getLatLng();
          onChange({
            ...value,
            lat: position.lat,
            lng: position.lng,
          });
        },
      }}
    />
  );
}

function MapCenterSync({ value }: { value: AssetLocation }) {
  const map = useMap();

  if (Math.abs(map.getCenter().lat - value.lat) > 0.0001 || Math.abs(map.getCenter().lng - value.lng) > 0.0001) {
    map.flyTo([value.lat, value.lng], map.getZoom(), { duration: 0.5 });
  }

  return null;
}

export function MapPicker({
  value,
  onChange,
  onClose,
}: {
  value: AssetLocation;
  onChange: (location: AssetLocation) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(value);
  const [query, setQuery] = useState(value.label ?? "");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const center = useMemo<[number, number]>(() => [draft.lat, draft.lng], [draft.lat, draft.lng]);

  return (
    <div className="modal">
      <div className="modal__surface modal__surface--map">
        <div className="panel__header">
          <h2>{t("panel.map")}</h2>
          <button type="button" className="button button--secondary" onClick={onClose}>
            {t("action.close")}
          </button>
        </div>

        <MapContainer center={center} zoom={13} className="map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapCenterSync value={draft} />
          <DraggableMarker value={draft} onChange={setDraft} />
        </MapContainer>

        <div className="map__controls">
          <label className="field field--full">
            <span>{t("field.mapSearch")}</span>
            <div className="toolbar">
              <input value={query} onChange={(event) => setQuery(event.target.value)} />
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  setSearching(true);
                  void searchPlaces(query, navigator.language || "en-US")
                    .then(setResults)
                    .finally(() => setSearching(false));
                }}
              >
                {searching ? t("status.running") : t("action.searchPlace")}
              </button>
            </div>
            <small className="muted">{t("hint.mapSearch")}</small>
          </label>
          {results.length > 0 ? (
            <div className="map-search-results field--full">
              {results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="map-search-results__item"
                  onClick={() => {
                    setDraft({
                      lat: result.lat,
                      lng: result.lng,
                      label: result.displayName,
                    });
                    setQuery(result.displayName);
                  }}
                >
                  {result.displayName}
                </button>
              ))}
            </div>
          ) : null}
          <label className="field">
            <span>{t("field.locationLabel")}</span>
            <input
              value={draft.label ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  label: event.target.value,
                }))
              }
            />
          </label>
          <label className="field">
            <span>{t("field.latitude")}</span>
            <input
              type="number"
              value={draft.lat}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  lat: Number(event.target.value),
                }))
              }
            />
          </label>
          <label className="field">
            <span>{t("field.longitude")}</span>
            <input
              type="number"
              value={draft.lng}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  lng: Number(event.target.value),
                }))
              }
            />
          </label>
          <button
            type="button"
            className="button"
            onClick={() => {
              onChange(draft);
              onClose();
            }}
          >
            {t("action.useCurrentViewport")}
          </button>
        </div>
      </div>
    </div>
  );
}
