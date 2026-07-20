"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

type EntityType = "artist" | "place" | "label" | "release" | "performance";
type Precision = "exact venue" | "city" | "region" | "country" | "approximate" | "unknown";

type AtlasNode = {
  id: string;
  name: string;
  type: EntityType;
  coordinates: [number, number];
  year?: number;
  endYear?: number;
  location: string;
  description: string;
  precision: Precision;
  source: "MusicBrainz" | "Wikidata" | "Curated" | "Cover Art Archive";
  sourceUrl?: string;
};

type Atlas = {
  artist: { id: string; name: string; subtitle: string; years: string; country: string };
  center: [number, number];
  nodes: AtlasNode[];
};

type SearchResult = {
  id: string;
  name: string;
  type?: string;
  country?: string;
  disambiguation?: string;
  area?: { name?: string };
  "life-span"?: { begin?: string; end?: string; ended?: boolean };
};

type Theme = "light" | "dark";
type AtlasMap = MapLibreMap & { __atlasNodes?: AtlasNode[]; __atlasAnchor?: [number, number]; __theme?: Theme };

const typeMeta: Record<EntityType, { label: string; color: string }> = {
  artist: { label: "Artists", color: "#ff6b4a" },
  place: { label: "Places", color: "#ffd166" },
  label: { label: "Labels", color: "#9c8cff" },
  release: { label: "Releases", color: "#58d6b3" },
  performance: { label: "Performances", color: "#6bb7ff" },
};

const countryCenters: Record<string, [number, number]> = {
  US: [-98.5, 39.8], GB: [-3.4, 54.6], IS: [-18.7, 64.9], NG: [8.7, 9.1], DE: [10.4, 51.2],
  PR: [-66.5, 18.2], CA: [-106.3, 56.1], FR: [2.2, 46.2], BR: [-51.9, -14.2], JP: [138.2, 36.2],
  AU: [133.8, -25.3], IE: [-8.2, 53.2], JM: [-77.3, 18.1], MX: [-102.5, 23.6], SE: [18.6, 60.1],
};

const atlasData: Record<string, Atlas> = {
  "1b4dd0d8-99d6-4e7c-a7b6-866f30c5c67d": {
    artist: { id: "1b4dd0d8-99d6-4e7c-a7b6-866f30c5c67d", name: "Fela Kuti", subtitle: "Nigerian bandleader, composer & activist", years: "1938—1997", country: "Nigeria" },
    center: [3.3792, 6.5244],
    nodes: [
      { id: "fela", name: "Fela Kuti", type: "artist", coordinates: [3.3792, 6.5244], year: 1938, endYear: 1997, location: "Lagos, Nigeria", description: "The restless center of Afrobeat: bandleader, saxophonist, composer and political provocateur.", precision: "city", source: "Curated" },
      { id: "kalakuta", name: "Kalakuta Republic", type: "place", coordinates: [3.3515, 6.5065], year: 1970, endYear: 1977, location: "Jibowu, Lagos", description: "Fela’s communal compound, rehearsal space and self-declared independent republic.", precision: "approximate", source: "Curated" },
      { id: "shrine", name: "Afrika Shrine", type: "performance", coordinates: [3.3617, 6.5346], year: 1972, endYear: 1977, location: "Lagos, Nigeria", description: "The legendary club where Africa 70 held immersive, all-night performances.", precision: "approximate", source: "Curated" },
      { id: "abeokuta", name: "Abeokuta", type: "place", coordinates: [3.349, 7.1475], year: 1938, location: "Ogun State, Nigeria", description: "Fela’s birthplace and the home of the influential Ransome-Kuti family.", precision: "city", source: "Wikidata" },
      { id: "london-fela", name: "Trinity College of Music", type: "place", coordinates: [-0.0117, 51.4828], year: 1958, endYear: 1963, location: "London, UK", description: "Fela studied classical music here before returning to Nigeria.", precision: "exact venue", source: "Curated" },
      { id: "emi-fela", name: "EMI Nigeria", type: "label", coordinates: [3.397, 6.453], year: 1971, location: "Lagos, Nigeria", description: "Label connection during a defining run of early Afrobeat recordings.", precision: "city", source: "Curated" },
      { id: "zombie", name: "Zombie", type: "release", coordinates: [3.37, 6.51], year: 1976, location: "Lagos, Nigeria", description: "The incendiary album that sharpened Fela’s confrontation with Nigeria’s military establishment.", precision: "city", source: "MusicBrainz" },
    ],
  },
  "5441c29d-3602-4898-b1a1-b77fa23b8e50": {
    artist: { id: "5441c29d-3602-4898-b1a1-b77fa23b8e50", name: "David Bowie", subtitle: "English singer, songwriter & shape-shifter", years: "1947—2016", country: "United Kingdom" },
    center: [-0.114, 51.461],
    nodes: [
      { id: "bowie", name: "David Bowie", type: "artist", coordinates: [-0.114, 51.461], year: 1947, endYear: 2016, location: "Brixton, London", description: "A restless artist whose changing identities redrew the boundaries of popular music.", precision: "city", source: "Wikidata" },
      { id: "hansa", name: "Hansa Studios", type: "place", coordinates: [13.3827, 52.5074], year: 1977, endYear: 1979, location: "Berlin, Germany", description: "The studio overlooking the Wall associated with Bowie’s celebrated Berlin period.", precision: "exact venue", source: "Curated" },
      { id: "rca-bowie", name: "RCA Records", type: "label", coordinates: [-74.006, 40.7128], year: 1971, endYear: 1982, location: "New York, USA", description: "Bowie’s label through a prolific decade of transformation.", precision: "city", source: "MusicBrainz" },
      { id: "low", name: "Low", type: "release", coordinates: [13.37, 52.51], year: 1977, location: "Berlin, Germany", description: "Fragmented pop songs and electronic instrumentals opened the Berlin Trilogy.", precision: "city", source: "MusicBrainz" },
      { id: "ziggy", name: "Ziggy Stardust tour", type: "performance", coordinates: [-0.1276, 51.5072], year: 1972, endYear: 1973, location: "London, UK", description: "The theatrical campaign that turned Bowie’s alien rock star into a cultural event.", precision: "city", source: "Curated" },
      { id: "eno", name: "Brian Eno", type: "artist", coordinates: [-1.2577, 52.6298], year: 1977, endYear: 1979, location: "Woodbridge, UK", description: "Collaborator on the experimental language of the Berlin records.", precision: "city", source: "Curated" },
    ],
  },
  "87aa6a6f-157f-4c0a-82c7-33a309b5a770": {
    artist: { id: "87aa6a6f-157f-4c0a-82c7-33a309b5a770", name: "Björk", subtitle: "Icelandic composer, producer & vocalist", years: "1965—present", country: "Iceland" },
    center: [-21.9426, 64.1466],
    nodes: [
      { id: "bjork", name: "Björk", type: "artist", coordinates: [-21.9426, 64.1466], year: 1965, location: "Reykjavík, Iceland", description: "A singular composer and producer connecting voice, technology, landscape and radical pop.", precision: "city", source: "Wikidata" },
      { id: "bad-taste", name: "Smekkleysa / Bad Taste", type: "label", coordinates: [-21.94, 64.145], year: 1986, location: "Reykjavík, Iceland", description: "Artist-run collective and label founded by members of The Sugarcubes.", precision: "city", source: "Curated" },
      { id: "sugarcubes", name: "The Sugarcubes", type: "artist", coordinates: [-21.91, 64.14], year: 1986, endYear: 1992, location: "Reykjavík, Iceland", description: "Björk’s exuberant alternative rock group before her solo reinvention.", precision: "city", source: "MusicBrainz" },
      { id: "homogenic", name: "Homogenic", type: "release", coordinates: [-18.5, 64.8], year: 1997, location: "Iceland / Málaga / London", description: "Volcanic beats and strings imagined as an uncompromising Icelandic landscape.", precision: "country", source: "Curated" },
      { id: "olympic", name: "Olympic Studios", type: "place", coordinates: [-0.2277, 51.4808], year: 1993, location: "London, UK", description: "One of the recording sites connected to Björk’s solo debut.", precision: "exact venue", source: "Curated" },
      { id: "cornucopia", name: "Cornucopia", type: "performance", coordinates: [-74.0059, 40.7128], year: 2019, endYear: 2023, location: "New York & international", description: "A theatrical concert work joining custom instruments, spatial sound and digital visuals.", precision: "city", source: "Curated" },
    ],
  },
  "561d854a-6a28-4aa7-8c99-323e6ce46c2a": {
    artist: { id: "561d854a-6a28-4aa7-8c99-323e6ce46c2a", name: "Kraftwerk", subtitle: "German electronic music pioneers", years: "1970—present", country: "Germany" },
    center: [6.7735, 51.2277],
    nodes: [
      { id: "kraftwerk", name: "Kraftwerk", type: "artist", coordinates: [6.7735, 51.2277], year: 1970, location: "Düsseldorf, Germany", description: "The Düsseldorf group whose precise electronic minimalism became a blueprint for modern music.", precision: "city", source: "Wikidata" },
      { id: "kling-klang", name: "Kling Klang Studio", type: "place", coordinates: [6.789, 51.231], year: 1970, endYear: 2009, location: "Düsseldorf, Germany", description: "Kraftwerk’s private laboratory, studio and conceptual headquarters.", precision: "approximate", source: "Curated" },
      { id: "ralf", name: "Ralf Hütter", type: "artist", coordinates: [6.8, 51.2], year: 1970, location: "Düsseldorf, Germany", description: "Co-founder, vocalist and architect of the group’s controlled machine aesthetic.", precision: "city", source: "MusicBrainz" },
      { id: "autobahn", name: "Autobahn", type: "release", coordinates: [7.1, 51.3], year: 1974, location: "Düsseldorf, Germany", description: "A 22-minute road journey that brought Kraftwerk’s electronic language worldwide.", precision: "city", source: "MusicBrainz" },
      { id: "parlophone", name: "Parlophone", type: "label", coordinates: [-0.1276, 51.5072], year: 1985, location: "London, UK", description: "One label in the group’s long international release history.", precision: "city", source: "MusicBrainz" },
      { id: "moma", name: "Kraftwerk—Retrospective 1 2 3 4 5 6 7 8", type: "performance", coordinates: [-73.9776, 40.7614], year: 2012, location: "MoMA, New York", description: "Eight albums performed across eight nights in the museum atrium.", precision: "exact venue", source: "Curated" },
    ],
  },
  "2f9ecbed-27be-40e6-abca-6de49d50299e": {
    artist: { id: "2f9ecbed-27be-40e6-abca-6de49d50299e", name: "Miles Davis", subtitle: "American trumpeter, composer & bandleader", years: "1926—1991", country: "United States" },
    center: [-90.1506, 38.8906],
    nodes: [
      { id: "miles", name: "Miles Davis", type: "artist", coordinates: [-90.1506, 38.8906], year: 1926, endYear: 1991, location: "Alton, Illinois", description: "A defining modern musician who repeatedly changed the direction of jazz.", precision: "city", source: "Wikidata" },
      { id: "52nd", name: "52nd Street", type: "place", coordinates: [-73.9818, 40.759], year: 1944, endYear: 1950, location: "New York, USA", description: "The cluster of clubs where Davis entered the orbit of Charlie Parker and bebop.", precision: "exact venue", source: "Curated" },
      { id: "columbia", name: "Columbia Records", type: "label", coordinates: [-73.989, 40.753], year: 1955, endYear: 1985, location: "New York, USA", description: "Home to the vast majority of Davis’s classic catalog.", precision: "city", source: "MusicBrainz" },
      { id: "kind-blue", name: "Kind of Blue", type: "release", coordinates: [-73.994, 40.764], year: 1959, location: "30th Street Studio, New York", description: "A modal jazz landmark recorded in two spare, luminous sessions.", precision: "exact venue", source: "Curated" },
      { id: "parker", name: "Charlie Parker", type: "artist", coordinates: [-94.5786, 39.0997], year: 1945, endYear: 1948, location: "Kansas City / New York", description: "Davis’s early bandleader and one of bebop’s principal inventors.", precision: "city", source: "Curated" },
      { id: "newport", name: "Newport Jazz Festival", type: "performance", coordinates: [-71.3128, 41.4901], year: 1955, location: "Newport, Rhode Island", description: "A breakout performance that helped secure Davis’s Columbia contract.", precision: "exact venue", source: "Curated" },
    ],
  },
  "e0140a67-e4d1-4f13-8a01-364355bee46e": {
    artist: { id: "e0140a67-e4d1-4f13-8a01-364355bee46e", name: "Bad Bunny", subtitle: "Puerto Rican vocalist, rapper & producer", years: "1994—present", country: "Puerto Rico" },
    center: [-66.486, 18.3985],
    nodes: [
      { id: "bunny", name: "Bad Bunny", type: "artist", coordinates: [-66.486, 18.3985], year: 1994, location: "Vega Baja, Puerto Rico", description: "A global pop force who keeps Puerto Rican identity at the center of his work.", precision: "city", source: "Wikidata" },
      { id: "san-juan", name: "San Juan", type: "place", coordinates: [-66.1057, 18.4655], year: 2016, location: "Puerto Rico", description: "The island capital and a key center for the modern urbano movement.", precision: "city", source: "Curated" },
      { id: "rimas", name: "Rimas Entertainment", type: "label", coordinates: [-66.1057, 18.4655], year: 2016, location: "San Juan, Puerto Rico", description: "Independent label behind Bad Bunny’s rapid global rise.", precision: "city", source: "MusicBrainz" },
      { id: "x100pre", name: "X 100PRE", type: "release", coordinates: [-66.2, 18.35], year: 2018, location: "Puerto Rico", description: "A shape-shifting debut spanning trap, reggaetón, rock and nostalgic pop.", precision: "country", source: "MusicBrainz" },
      { id: "choliseo", name: "José Miguel Agrelot Coliseum", type: "performance", coordinates: [-66.0731, 18.4278], year: 2019, location: "San Juan, Puerto Rico", description: "A recurring hometown stage for ambitious, celebratory arena spectacles.", precision: "exact venue", source: "Curated" },
      { id: "mia", name: "Drake", type: "artist", coordinates: [-79.3832, 43.6532], year: 2018, location: "Toronto, Canada", description: "Collaborator on “MIA,” an early Spanish-language number-one crossover.", precision: "city", source: "Curated" },
    ],
  },
};

const suggested = Object.values(atlasData).map((atlas) => atlas.artist);

function yearsFor(result: SearchResult) {
  const span = result["life-span"];
  if (!span?.begin) return "Dates unknown";
  return `${span.begin.slice(0, 4)}—${span.end?.slice(0, 4) || (span.ended ? "?" : "present")}`;
}

function seedOffset(seed: string, amount: number) {
  let value = 0;
  for (const char of seed) value = (value * 31 + char.charCodeAt(0)) % 1000;
  return ((value / 999) - 0.5) * amount;
}

function entityNode(id: string, name: string, type: EntityType, center: [number, number], index: number, description: string, sourceUrl: string): AtlasNode {
  return {
    id, name, type,
    coordinates: [center[0] + seedOffset(id, 12 + index), center[1] + seedOffset(`${id}-lat`, 5 + index / 2)],
    location: "Location inferred from artist area",
    description,
    precision: "approximate",
    source: "MusicBrainz",
    sourceUrl,
  };
}

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [detail, setDetail] = useState<AtlasNode | null>(null);
  const [loadingStage, setLoadingStage] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<EntityType>>(new Set(Object.keys(typeMeta) as EntityType[]));
  const [yearRange, setYearRange] = useState<[number, number]>([1940, 2026]);
  const [playing, setPlaying] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  const visibleNodes = useMemo(() => (atlas?.nodes ?? []).filter((node) => {
    const start = node.year ?? 1940;
    const end = node.endYear ?? node.year ?? 2026;
    return activeTypes.has(node.type) && end >= yearRange[0] && start <= yearRange[1];
  }), [atlas, activeTypes, yearRange]);

  const loadArtist = useCallback(async (result: SearchResult | { id: string; name: string }, navigate = true) => {
    setQuery(""); setResults([]); setDetail(null); setLoadingStage("Locating artist…");
    if (navigate) window.history.pushState({ artist: result.id }, "", `?artist=${result.id}`);

    const curated = atlasData[result.id];
    if (curated) {
      setAtlas(curated);
      setLoadingStage(null);
      return;
    }

    try {
      const baseUrl = `https://musicbrainz.org/ws/2/artist/${result.id}?inc=url-rels+artist-rels+label-rels&fmt=json`;
      const artistResponse = await fetch(baseUrl, { headers: { Accept: "application/json" } });
      if (!artistResponse.ok) throw new Error("Artist lookup failed");
      const artist = await artistResponse.json();
      const country = artist.country || artist.area?.["iso-3166-1-codes"]?.[0] || "";
      let center = countryCenters[country] || countryCenters.US;
      let locationSource: AtlasNode["source"] = "MusicBrainz";
      let locationName = artist.area?.name || artist["begin-area"]?.name || artist.country || "Approximate location";

      setLoadingStage("Resolving places…");
      const wikidataRelation = artist.relations?.find((relation: { type?: string; url?: { resource?: string } }) => relation.type === "wikidata");
      const qid = wikidataRelation?.url?.resource?.match(/Q\d+/)?.[0];
      if (qid) {
        try {
          const wikiResponse = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims%7Cdescriptions&languages=en&origin=*&format=json`);
          const entity = (await wikiResponse.json()).entities?.[qid];
          const coordinate = entity?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
          if (coordinate) {
            center = [coordinate.longitude, coordinate.latitude];
            locationSource = "Wikidata";
          }
          const placeQid = entity?.claims?.P19?.[0]?.mainsnak?.datavalue?.value?.id;
          if (placeQid && !coordinate) {
            const placeResponse = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${placeQid}&props=claims%7Clabels&languages=en&origin=*&format=json`);
            const place = (await placeResponse.json()).entities?.[placeQid];
            const placeCoordinate = place?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
            if (placeCoordinate) {
              center = [placeCoordinate.longitude, placeCoordinate.latitude];
              locationName = place.labels?.en?.value || locationName;
              locationSource = "Wikidata";
            }
          }
        } catch { /* MusicBrainz area remains a valid fallback. */ }
      }

      const nodes: AtlasNode[] = [{
        id: artist.id, name: artist.name, type: "artist", coordinates: center,
        year: Number(artist["life-span"]?.begin?.slice(0, 4)) || undefined,
        endYear: Number(artist["life-span"]?.end?.slice(0, 4)) || undefined,
        location: locationName,
        description: artist.disambiguation || `${artist.type || "Artist"} connected to ${locationName}. Live public data can be incomplete.`,
        precision: locationSource === "Wikidata" ? "city" : country ? "country" : "approximate",
        source: locationSource,
        sourceUrl: `https://musicbrainz.org/artist/${artist.id}`,
      }];

      (artist.relations || []).filter((relation: { artist?: unknown }) => relation.artist).slice(0, 7).forEach((relation: { artist: { id: string; name: string }; type?: string }, index: number) => {
        nodes.push(entityNode(relation.artist.id, relation.artist.name, "artist", center, index, `${relation.type || "Artist"} relationship with ${artist.name}. Select this artist to explore further.`, `https://musicbrainz.org/artist/${relation.artist.id}`));
      });
      (artist.relations || []).filter((relation: { label?: unknown }) => relation.label).slice(0, 5).forEach((relation: { label: { id: string; name: string }; type?: string }, index: number) => {
        nodes.push(entityNode(relation.label.id, relation.label.name, "label", center, index + 3, `${relation.type || "Label"} connection listed by MusicBrainz.`, `https://musicbrainz.org/label/${relation.label.id}`));
      });

      setAtlas({
        artist: { id: artist.id, name: artist.name, subtitle: artist.disambiguation || `${artist.type || "Artist"} from ${locationName}`, years: yearsFor(artist), country: artist.country || artist.area?.name || "Unknown area" },
        center, nodes,
      });
      setLoadingStage("Loading selected releases…");

      try {
        const releaseResponse = await fetch(`https://musicbrainz.org/ws/2/release-group?artist=${artist.id}&limit=6&fmt=json`, { headers: { Accept: "application/json" } });
        if (releaseResponse.ok) {
          const releases = (await releaseResponse.json())["release-groups"] || [];
          const releaseNodes = releases.map((release: { id: string; title: string; "first-release-date"?: string; "primary-type"?: string }, index: number) => ({
            ...entityNode(release.id, release.title, "release", center, index + 5, `${release["primary-type"] || "Release"} by ${artist.name}. Artwork may be available from the Cover Art Archive.`, `https://musicbrainz.org/release-group/${release.id}`),
            year: Number(release["first-release-date"]?.slice(0, 4)) || undefined,
          }));
          setAtlas((current) => current ? { ...current, nodes: [...current.nodes, ...releaseNodes] } : current);
        }
      } catch { /* Secondary data can fail independently. */ }
      setLoadingStage(null);
    } catch {
      setLoadingStage(null);
      setAtlas({
        artist: { id: result.id, name: result.name, subtitle: "Live data is temporarily unavailable", years: "Dates unavailable", country: "Location unavailable" },
        center: [0, 20],
        nodes: [],
      });
    }
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("artist");
    if (id) queueMicrotask(() => loadArtist({ id, name: "Artist" }, false));
    const onPopState = () => {
      const artistId = new URLSearchParams(window.location.search).get("artist");
      if (artistId) loadArtist({ id: artistId, name: "Artist" }, false);
      else { setAtlas(null); setDetail(null); }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [loadArtist]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true); setSearchError(false);
      try {
        const response = await fetch(`https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(query.trim())}&fmt=json&limit=7`, { signal: controller.signal, headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error();
        setResults((await response.json()).artists || []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSearchError(true);
      } finally { setSearching(false); }
    }, 650);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    import("maplibre-gl").then((maplibregl) => {
      if (cancelled || !mapContainer.current || mapRef.current) return;
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: "https://tiles.openfreemap.org/styles/bright",
        center: [5, 24], zoom: 1.55, minZoom: 1.2, pitch: 18, attributionControl: false,
      });
      (map as AtlasMap).__theme = "light";
      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
      map.on("style.load", () => {
        const atlasMap = map as AtlasMap;
        const nodes = atlasMap.__atlasNodes ?? [];
        const features = nodes.map((node) => ({ type: "Feature" as const, properties: { id: node.id, type: node.type }, geometry: { type: "Point" as const, coordinates: node.coordinates } }));
        const lines = atlasMap.__atlasAnchor ? nodes.slice(1).map((node) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [atlasMap.__atlasAnchor as [number, number], node.coordinates] } })) : [];
        map.addSource("atlas-lines", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addSource("atlas-points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "atlas-lines", type: "line", source: "atlas-lines", paint: { "line-color": "#ff6b4a", "line-width": 1.2, "line-opacity": 0.52, "line-dasharray": [2, 2] } });
        map.addLayer({ id: "atlas-halo", type: "circle", source: "atlas-points", paint: { "circle-radius": 13, "circle-color": ["match", ["get", "type"], "artist", "#ff6b4a", "place", "#ffd166", "label", "#9c8cff", "release", "#58d6b3", "#6bb7ff"], "circle-opacity": 0.12 } });
        map.addLayer({ id: "atlas-points", type: "circle", source: "atlas-points", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 4, 6, 8], "circle-color": ["match", ["get", "type"], "artist", "#ff6b4a", "place", "#ffd166", "label", "#9c8cff", "release", "#58d6b3", "#6bb7ff"], "circle-stroke-color": atlasMap.__theme === "light" ? "#f4f0e7" : "#131816", "circle-stroke-width": 2 } });
        (map.getSource("atlas-points") as { setData: (data: object) => void }).setData({ type: "FeatureCollection", features });
        (map.getSource("atlas-lines") as { setData: (data: object) => void }).setData({ type: "FeatureCollection", features: lines });
      });
      map.on("mouseenter", "atlas-points", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "atlas-points", () => { map.getCanvas().style.cursor = ""; });
      map.on("click", "atlas-points", (event) => {
        const id = event.features?.[0]?.properties?.id;
        const node = (mapRef.current as AtlasMap).__atlasNodes?.find((item) => item.id === id);
        if (node) setDetail(node);
      });
      mapRef.current = map;
    });
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current as AtlasMap | null;
    if (!map) return;
    const update = () => {
      map.__atlasNodes = visibleNodes;
      map.__atlasAnchor = atlas?.nodes[0]?.coordinates;
      const features = visibleNodes.map((node) => ({ type: "Feature" as const, properties: { id: node.id, type: node.type }, geometry: { type: "Point" as const, coordinates: node.coordinates } }));
      const anchor = atlas?.nodes[0]?.coordinates;
      const lines = anchor ? visibleNodes.slice(1).map((node) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [anchor, node.coordinates] } })) : [];
      (map.getSource("atlas-points") as { setData: (data: object) => void } | undefined)?.setData({ type: "FeatureCollection", features });
      (map.getSource("atlas-lines") as { setData: (data: object) => void } | undefined)?.setData({ type: "FeatureCollection", features: lines });
      if (atlas) map.flyTo({ center: atlas.center, zoom: atlas.nodes.length > 1 ? 4.1 : 2.8, duration: 1800, essential: true });
    };
    if (map.isStyleLoaded()) update(); else map.once("style.load", update);
  }, [atlas, visibleNodes]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setYearRange(([start, end]) => end >= 2026 ? [start, Math.max(start, 1940)] : [start, Math.min(2026, end + 1)]);
    }, 350);
    return () => window.clearInterval(timer);
  }, [playing]);

  const toggleType = (type: EntityType) => setActiveTypes((current) => {
    const next = new Set(current);
    if (next.has(type)) next.delete(type); else next.add(type);
    return next;
  });

  const updateQuery = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) { setResults([]); setSearching(false); setSearchError(false); }
  };

  const switchTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    const map = mapRef.current as AtlasMap | null;
    if (map) {
      map.__theme = nextTheme;
      map.setStyle(`https://tiles.openfreemap.org/styles/${nextTheme === "light" ? "bright" : "dark"}`);
    }
  };

  return (
    <main className={`atlas-shell ${theme}`}>
      <div ref={mapContainer} className="map" aria-label="Interactive world map of musical connections" />
      <div className="map-vignette" />

      <header className="topbar">
        <button className="brand" onClick={() => { window.history.pushState({}, "", "/"); setAtlas(null); setDetail(null); }} aria-label="Return to Music Atlas home">
          <span className="brand-mark">M∿</span><span>MUSIC ATLAS</span>
        </button>
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Search any artist…" aria-label="Search MusicBrainz for an artist" />
          {searching && <span className="search-spinner" aria-label="Searching" />}
          {(results.length > 0 || searchError) && (
            <div className="search-results">
              <div className="results-label">MUSICBRAINZ RESULTS</div>
              {searchError ? <div className="search-message">Live search is taking a break. Try a suggested artist below.</div> : results.map((result) => (
                <button key={result.id} onClick={() => loadArtist(result)}>
                  <span className="result-main"><strong>{result.name}</strong><small>{result.disambiguation || result.type || "Artist"}</small></span>
                  <span className="result-meta">{result.area?.name || result.country || "Area unknown"}<small>{yearsFor(result)}</small></span>
                </button>
              ))}
              <a href="https://musicbrainz.org" target="_blank" rel="noreferrer">Data from MusicBrainz ↗</a>
            </div>
          )}
        </div>
        <div className="theme-toggle" role="group" aria-label="Color theme">
          <button className={theme === "light" ? "active" : ""} onClick={() => switchTheme("light")} aria-pressed={theme === "light"} aria-label="Use light theme"><span aria-hidden="true">☀</span><span className="theme-label">Light</span></button>
          <button className={theme === "dark" ? "active" : ""} onClick={() => switchTheme("dark")} aria-pressed={theme === "dark"} aria-label="Use dark theme"><span aria-hidden="true">◐</span><span className="theme-label">Dark</span></button>
        </div>
        <button className="filter-mobile" onClick={() => setMobileFilters(!mobileFilters)} aria-expanded={mobileFilters}>Layers <span>☷</span></button>
      </header>

      {!atlas && (
        <section className="landing-card">
          <p className="eyebrow">FOLLOW THE SOUND</p>
          <h1>Every artist<br />leaves a trail.</h1>
          <p className="intro">Explore the places, people, labels and releases that shape the music you love.</p>
          <div className="suggestion-label"><span>START WITH A STORY</span><span>CURATED ATLAS</span></div>
          <div className="suggestions">
            {suggested.map((artist, index) => (
              <button key={artist.id} onClick={() => loadArtist(artist)}>
                <span className="suggestion-index">0{index + 1}</span>
                <span><strong>{artist.name}</strong><small>{artist.country} · {artist.years}</small></span>
                <span className="arrow">↗</span>
              </button>
            ))}
          </div>
          <p className="landing-note"><span>●</span> Live public data, strengthened with hand-picked stories.</p>
        </section>
      )}

      {atlas && (
        <section className="artist-card">
          <button className="back" onClick={() => { window.history.back(); }}>← <span>Back to atlas</span></button>
          <div className="artist-title"><div className="title-pulse" /><div><p>EXPLORING</p><h1>{atlas.artist.name}</h1></div></div>
          <p className="artist-subtitle">{atlas.artist.subtitle}</p>
          <div className="artist-facts"><span>{atlas.artist.country}</span><span>{atlas.artist.years}</span><span>{visibleNodes.length} connections</span></div>
          {loadingStage && <div className="progressive"><span className="search-spinner" /> {loadingStage}</div>}
          {!loadingStage && atlas.nodes.length === 0 && <div className="empty-state">This artist has too little mappable public data right now. Try one of the curated stories.</div>}
        </section>
      )}

      <aside className={`layers-panel ${mobileFilters ? "open" : ""}`}>
        <div className="panel-heading"><span>MAP LAYERS</span><button onClick={() => setMobileFilters(false)}>×</button></div>
        {(Object.entries(typeMeta) as [EntityType, { label: string; color: string }][]).map(([type, meta]) => (
          <button key={type} className={activeTypes.has(type) ? "active" : ""} onClick={() => toggleType(type)}>
            <span className="layer-dot" style={{ "--dot": meta.color } as React.CSSProperties} />
            <span>{meta.label}</span><small>{atlas?.nodes.filter((node) => node.type === type).length || 0}</small>
            <span className="check">{activeTypes.has(type) ? "✓" : ""}</span>
          </button>
        ))}
        <div className="source-key"><span>◒</span><p><strong>DATA LAYERS</strong> Live + curated sources</p></div>
      </aside>

      {detail && (
        <aside className="detail-panel">
          <button className="detail-close" onClick={() => setDetail(null)} aria-label="Close detail panel">×</button>
          <div className="detail-type"><span style={{ background: typeMeta[detail.type].color }} />{detail.type.toUpperCase()}</div>
          <h2>{detail.name}</h2>
          <p className="detail-location">⌖ {detail.location}</p>
          <div className="detail-rule" />
          <p>{detail.description}</p>
          <div className="detail-grid"><div><small>DATE</small><strong>{detail.year ? `${detail.year}${detail.endYear ? `—${detail.endYear}` : ""}` : "Unknown"}</strong></div><div><small>PRECISION</small><strong>≈ {detail.precision}</strong></div></div>
          <div className="provenance"><span>Source</span><strong className={detail.source === "Curated" ? "curated" : ""}>{detail.source === "Curated" ? "◆ " : "↗ "}{detail.source}</strong></div>
          {detail.sourceUrl && <a className="source-link" href={detail.sourceUrl} target="_blank" rel="noreferrer">Open original source ↗</a>}
          {detail.type === "artist" && detail.id !== atlas?.artist.id && <button className="follow-button" onClick={() => loadArtist({ id: detail.id, name: detail.name })}>Explore this artist <span>→</span></button>}
        </aside>
      )}

      <section className="timeline" aria-label="Timeline controls">
        <div className="timeline-head"><span>TIMELINE</span><strong>{yearRange[0]} — {yearRange[1] === 2026 ? "NOW" : yearRange[1]}</strong><button onClick={() => { setYearRange([1940, 2026]); setPlaying(!playing); }} aria-label={playing ? "Pause timeline" : "Play timeline"}>{playing ? "Ⅱ" : "▶"}</button></div>
        <div className="range-wrap">
          <div className="range-line" /><div className="range-active" style={{ left: `${((yearRange[0] - 1940) / 86) * 100}%`, right: `${100 - ((yearRange[1] - 1940) / 86) * 100}%` }} />
          <input type="range" min="1940" max="2026" value={yearRange[0]} onChange={(event) => setYearRange([Math.min(Number(event.target.value), yearRange[1] - 1), yearRange[1]])} aria-label="Timeline start year" />
          <input type="range" min="1940" max="2026" value={yearRange[1]} onChange={(event) => setYearRange([yearRange[0], Math.max(Number(event.target.value), yearRange[0] + 1)])} aria-label="Timeline end year" />
        </div>
        <div className="decades">{["ALL", "1960s", "1980s", "2000s", "2020s"].map((label) => <button key={label} onClick={() => label === "ALL" ? setYearRange([1940, 2026]) : setYearRange([Number(label.slice(0, 4)), Number(label.slice(0, 4)) + 9])}>{label}</button>)}</div>
      </section>

      <footer className="statusbar"><span><i /> LIVE SOURCES AVAILABLE</span><span>MusicBrainz · Wikidata · Curated Atlas</span><a href="https://musicbrainz.org" target="_blank" rel="noreferrer">About the data ↗</a></footer>
    </main>
  );
}
