import type { AssetLocation } from "../types/models";

export type PlaceSearchResult = AssetLocation & {
  id: string;
  displayName: string;
};

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
};

export async function searchPlaces(query: string, locale: string) {
  const search = query.trim();
  if (!search) {
    return [];
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", search);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("accept-language", locale);

  const response = await fetch(url.toString(), {
    headers: {
      "Accept-Language": locale,
    },
  });

  if (!response.ok) {
    throw new Error("Map search failed.");
  }

  const results = (await response.json()) as NominatimResult[];
  return results.map<PlaceSearchResult>((result) => ({
    id: String(result.place_id),
    lat: Number(result.lat),
    lng: Number(result.lon),
    label: result.display_name,
    displayName: result.display_name,
  }));
}
