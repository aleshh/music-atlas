"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

type EntityType = "artist" | "place" | "label" | "release" | "performance";
type Precision = "exact venue" | "city" | "region" | "country" | "approximate" | "unknown";
type AtlasSource = "MusicBrainz" | "Wikidata" | "Curated" | "Cover Art Archive";

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
  source: AtlasSource;
  sourceUrl?: string;
};

type AtlasRecord = {
  id: string;
  name: string;
  type: EntityType;
  year?: number;
  endYear?: number;
  description: string;
  source: AtlasSource;
  sourceUrl?: string;
};

type Atlas = {
  artist: { id: string; name: string; subtitle: string; years: string; country: string };
  center: [number, number];
  nodes: AtlasNode[];
  unmapped?: AtlasRecord[];
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
type ModalTab = "about" | "diagnostics";
type HoverPlacement = "left" | "right" | "above" | "below";
type HoverCard = { node: AtlasNode; x: number; y: number; placement: HoverPlacement };
type DiagnosticState = "idle" | "running" | "pass" | "fail" | "not-used";
type DiagnosticResult = {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  status: DiagnosticState;
  summary: string;
  duration?: number;
  detail?: string;
};

type WikipediaBio = { title: string; extract: string; url: string };
type UrlRelation = { type?: string; url?: { resource?: string } };
type MusicBrainzEvent = { id: string; name: string; type?: string; cancelled?: boolean; "life-span"?: { begin?: string; end?: string } };
type MusicBrainzRelation = UrlRelation & {
  begin?: string;
  end?: string;
  artist?: RelatedEntity;
  label?: RelatedEntity;
  place?: { id: string; name: string; address?: string; coordinates?: { latitude?: number; longitude?: number }; area?: { name?: string } };
  event?: MusicBrainzEvent;
};

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
  "6514cffa-fbe0-4965-ad88-e998ead8a82a": {
    artist: { id: "6514cffa-fbe0-4965-ad88-e998ead8a82a", name: "Fela Kuti", subtitle: "Nigerian bandleader, composer & activist", years: "1938—1997", country: "Nigeria" },
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
  "87c5dedd-371d-4a53-9f7f-80522fb7f3cb": {
    artist: { id: "87c5dedd-371d-4a53-9f7f-80522fb7f3cb", name: "Björk", subtitle: "Icelandic composer, producer & vocalist", years: "1965—present", country: "Iceland" },
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
  "5700dcd4-c139-4f31-aa3e-6382b9af9032": {
    artist: { id: "5700dcd4-c139-4f31-aa3e-6382b9af9032", name: "Kraftwerk", subtitle: "German electronic music pioneers", years: "1970—present", country: "Germany" },
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
  "561d854a-6a28-4aa7-8c99-323e6ce46c2a": {
    artist: { id: "561d854a-6a28-4aa7-8c99-323e6ce46c2a", name: "Miles Davis", subtitle: "American trumpeter, composer & bandleader", years: "1926—1991", country: "United States" },
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
  "89aa5ecb-59ad-46f5-b3eb-2d424e941f19": {
    artist: { id: "89aa5ecb-59ad-46f5-b3eb-2d424e941f19", name: "Bad Bunny", subtitle: "Puerto Rican vocalist, rapper & producer", years: "1994—present", country: "Puerto Rico" },
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
  "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d": {
    artist: { id: "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d", name: "The Beatles", subtitle: "English rock band and global pop phenomenon", years: "1960—1970", country: "United Kingdom" },
    center: [-2.9916, 53.4084],
    nodes: [
      { id: "beatles", name: "The Beatles", type: "artist", coordinates: [-2.9916, 53.4084], year: 1960, endYear: 1970, location: "Liverpool, England", description: "The Liverpool group whose songwriting, recording, and cultural reach transformed popular music.", precision: "city", source: "MusicBrainz", sourceUrl: "https://musicbrainz.org/artist/b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d" },
      { id: "beatles-liverpool", name: "Liverpool", type: "place", coordinates: [-2.9916, 53.4084], year: 1960, location: "Liverpool, England", description: "The band’s home city and the center of the Merseybeat scene from which they emerged.", precision: "city", source: "Curated" },
      { id: "cavern-club", name: "The Cavern Club", type: "place", coordinates: [-2.9875, 53.4066], year: 1961, endYear: 1963, location: "Mathew Street, Liverpool", description: "The basement club where the Beatles built a fervent local following through nearly 300 appearances.", precision: "exact venue", source: "Curated" },
      { id: "indra-club", name: "Indra Club", type: "place", coordinates: [9.9612, 53.5504], year: 1960, location: "St. Pauli, Hamburg", description: "The first Hamburg venue in the band’s formative run of demanding club residencies.", precision: "exact venue", source: "Curated" },
      { id: "abbey-road-studios", name: "EMI Recording Studios", type: "place", coordinates: [-0.1783, 51.5319], year: 1962, endYear: 1969, location: "Abbey Road, London", description: "The principal studio where the Beatles and producer George Martin expanded the language of recorded pop.", precision: "exact venue", source: "Curated" },
      { id: "parlophone-beatles", name: "Parlophone", type: "label", coordinates: [-0.1276, 51.5072], year: 1962, endYear: 1968, location: "London, England", description: "The EMI label that released the band’s defining British catalog under producer George Martin.", precision: "city", source: "MusicBrainz" },
      { id: "apple-records", name: "Apple Records", type: "label", coordinates: [-0.139, 51.5101], year: 1968, location: "Savile Row, London", description: "The Beatles’ own label and part of the wider Apple Corps experiment.", precision: "exact venue", source: "Curated" },
      { id: "please-please-me", name: "Please Please Me", type: "release", coordinates: [-0.1783, 51.5319], year: 1963, location: "EMI Recording Studios, London", description: "The debut album, largely captured during a famously concentrated studio session.", precision: "exact venue", source: "Curated" },
      { id: "sgt-pepper", name: "Sgt. Pepper’s Lonely Hearts Club Band", type: "release", coordinates: [-0.1783, 51.5319], year: 1967, location: "EMI Recording Studios, London", description: "A studio-centered landmark that turned recording itself into a primary compositional tool.", precision: "exact venue", source: "Curated" },
      { id: "abbey-road-album", name: "Abbey Road", type: "release", coordinates: [-0.1783, 51.5319], year: 1969, location: "EMI Recording Studios, London", description: "The final album recorded by the group, named for the street outside their principal studio.", precision: "exact venue", source: "Curated" },
      { id: "ed-sullivan", name: "The Ed Sullivan Show", type: "performance", coordinates: [-73.9833, 40.7637], year: 1964, location: "New York, USA", description: "The live American television appearance that became a defining image of Beatlemania.", precision: "exact venue", source: "Curated" },
      { id: "shea-stadium", name: "Shea Stadium", type: "performance", coordinates: [-73.8458, 40.7559], year: 1965, location: "Queens, New York", description: "A landmark stadium concert before more than 55,000 people at the height of Beatlemania.", precision: "exact venue", source: "Curated" },
      { id: "candlestick-park", name: "Candlestick Park", type: "performance", coordinates: [-122.386, 37.7136], year: 1966, location: "San Francisco, USA", description: "The final full concert of the Beatles’ touring years.", precision: "exact venue", source: "Curated" },
    ],
  },
};

const suggested = Object.values(atlasData).map((atlas) => atlas.artist);

const initialDiagnostics: DiagnosticResult[] = [
  { id: "mb-search", name: "Artist search", provider: "MusicBrainz", endpoint: "/ws/2/artist?query=artist:Autechre&fmt=json&limit=1", status: "idle", summary: "Checks search results and canonical artist IDs." },
  { id: "mb-lookup", name: "Artist relationships", provider: "MusicBrainz", endpoint: "/ws/2/artist/{MBID}?inc=url-rels+artist-rels+label-rels+place-rels+event-rels", status: "idle", summary: "Checks artist identity, areas, dates, and relationship arrays." },
  { id: "mb-releases", name: "Releases and labels", provider: "MusicBrainz", endpoint: "/ws/2/release?artist={MBID}&inc=labels+release-groups&limit=20", status: "idle", summary: "Checks the bounded release browse used for non-geographic records." },
  { id: "wikidata", name: "Geographic claims", provider: "Wikidata", endpoint: "/w/api.php?action=wbgetentities&ids=Q60&props=claims|labels", status: "idle", summary: "Checks entity labels and P625 coordinate claims." },
  { id: "wikipedia", name: "Artist biography", provider: "Wikipedia", endpoint: "/api/rest_v1/page/summary/Fela_Kuti", status: "idle", summary: "Checks a linked article summary and canonical page URL." },
  { id: "map", name: "Basemap style", provider: "OpenFreeMap", endpoint: "/styles/bright", status: "idle", summary: "Checks that the map style and its layer definitions are readable." },
  { id: "curated", name: "Curated atlas", provider: "Bundled JSON", endpoint: "Local application bundle", status: "idle", summary: "Checks curated records and coordinate bounds without a network request." },
  { id: "cover-art", name: "Release artwork", provider: "Cover Art Archive", endpoint: "No endpoint called", status: "not-used", summary: "Not currently requested by this prototype." },
];

function wikipediaTitleFromRelations(relations: UrlRelation[] = []) {
  const resource = relations.find((relation) => relation.type === "wikipedia" && relation.url?.resource?.includes("en.wikipedia.org/wiki/"))?.url?.resource;
  if (!resource) return null;
  try {
    return decodeURIComponent(new URL(resource).pathname.replace(/^\/wiki\//, ""));
  } catch { return null; }
}

async function fetchWikipediaBio(title: string): Promise<WikipediaBio> {
  const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replaceAll(" ", "_"))}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Wikipedia summary unavailable");
  const summary = await response.json() as { title?: string; extract?: string; content_urls?: { desktop?: { page?: string } } };
  if (!summary.title || !summary.extract || !summary.content_urls?.desktop?.page) throw new Error("Wikipedia summary incomplete");
  return { title: summary.title, extract: summary.extract, url: summary.content_urls.desktop.page };
}

function normalizedArtistName(name: string) {
  return name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function biographyExcerpt(extract: string, targetLength = 620) {
  if (extract.length <= targetLength) return extract;
  const sentences = new Intl.Segmenter("en", { granularity: "sentence" }).segment(extract);
  let excerpt = "";
  for (const sentence of sentences) {
    if (excerpt && excerpt.length + sentence.segment.length > targetLength) break;
    excerpt += sentence.segment;
  }
  return excerpt.trim() || extract;
}

function yearsFor(result: SearchResult) {
  const span = result["life-span"];
  if (!span?.begin) return "Dates unknown";
  return `${span.begin.slice(0, 4)}—${span.end?.slice(0, 4) || (span.ended ? "?" : "present")}`;
}

type RelatedEntity = { id: string; name: string; country?: string; area?: { "iso-3166-1-codes"?: string[] } };

function countryNode(entity: RelatedEntity, type: "artist" | "label", description: string): AtlasNode | null {
  const countryCode = entity.country || entity.area?.["iso-3166-1-codes"]?.[0];
  const coordinates = countryCode ? countryCenters[countryCode] : undefined;
  if (!countryCode || !coordinates) return null;
  const countryName = new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) || countryCode;

  return {
    id: entity.id,
    name: entity.name,
    type,
    coordinates,
    location: `${countryName} (country-level location)`,
    description,
    precision: "country",
    source: "MusicBrainz",
    sourceUrl: `https://musicbrainz.org/${type}/${entity.id}`,
  };
}

function yearFromDate(value?: string) {
  const year = Number(value?.slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : undefined;
}

function placeNode(relation: MusicBrainzRelation, artistName: string): AtlasNode | null {
  const place = relation.place;
  const latitude = place?.coordinates?.latitude;
  const longitude = place?.coordinates?.longitude;
  if (!place || typeof latitude !== "number" || typeof longitude !== "number") return null;
  return {
    id: place.id,
    name: place.name,
    type: "place",
    coordinates: [longitude, latitude],
    year: yearFromDate(relation.begin),
    endYear: yearFromDate(relation.end),
    location: [place.address, place.area?.name].filter(Boolean).join(" · ") || place.name,
    description: `${relation.type || "Place"} relationship with ${artistName}.`,
    precision: "exact venue",
    source: "MusicBrainz",
    sourceUrl: `https://musicbrainz.org/place/${place.id}`,
  };
}

function eventRecord(event: MusicBrainzEvent): AtlasRecord {
  return {
    id: event.id,
    name: event.name,
    type: "performance",
    year: yearFromDate(event["life-span"]?.begin),
    endYear: yearFromDate(event["life-span"]?.end),
    description: `${event.type || "Event"} linked to this artist; no source-backed venue coordinate has loaded yet.`,
    source: "MusicBrainz",
    sourceUrl: `https://musicbrainz.org/event/${event.id}`,
  };
}

function mergeRecords(current: AtlasRecord[] = [], incoming: AtlasRecord[]) {
  const records = new Map(current.map((record) => [`${record.type}:${record.id}`, record]));
  incoming.forEach((record) => records.set(`${record.type}:${record.id}`, record));
  return [...records.values()];
}

function recordInYearRange(record: Pick<AtlasRecord, "year" | "endYear">, range: [number, number]) {
  const start = record.year ?? 1940;
  const end = record.endYear ?? record.year ?? 2026;
  return end >= range[0] && start <= range[1];
}

function waitForMusicBrainz() {
  return new Promise((resolve) => window.setTimeout(resolve, 1100));
}

function atlasPointFeatures(nodes: AtlasNode[]) {
  const coordinateCounts = new Map<string, number>();
  const labeledCoordinates = new Set<string>();
  nodes.forEach((node) => {
    const key = node.coordinates.join(",");
    coordinateCounts.set(key, (coordinateCounts.get(key) ?? 0) + 1);
  });
  return nodes.map((node) => {
    const key = node.coordinates.join(",");
    const stackCount = labeledCoordinates.has(key) ? 1 : coordinateCounts.get(key) ?? 1;
    labeledCoordinates.add(key);
    return { type: "Feature" as const, properties: { id: node.id, type: node.type, stackCount }, geometry: { type: "Point" as const, coordinates: node.coordinates } };
  });
}

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const modalCloseRef = useRef<HTMLButtonElement>(null);
  const hoveredNodeRef = useRef<AtlasNode | null>(null);
  const hoverHideTimer = useRef<number | null>(null);
  const currentArtistRef = useRef<Atlas["artist"] | null>(null);
  const requestedBiographyArtistRef = useRef<string | null>(null);
  const biographyCache = useRef(new Map<string, WikipediaBio | null>());
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
  const [aboutOpen, setAboutOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>("about");
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>(initialDiagnostics);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticsRanAt, setDiagnosticsRanAt] = useState<string | null>(null);
  const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
  const [previousArtistName, setPreviousArtistName] = useState<string | null>(null);
  const [biography, setBiography] = useState<WikipediaBio | null>(null);
  const [biographyLoading, setBiographyLoading] = useState(false);
  const [biographyExpanded, setBiographyExpanded] = useState(false);
  const [unmappedExpanded, setUnmappedExpanded] = useState(false);

  const timelineNodes = useMemo(() => (atlas?.nodes ?? []).filter((node) => recordInYearRange(node, yearRange)), [atlas, yearRange]);
  const timelineUnmapped = useMemo(() => (atlas?.unmapped ?? []).filter((record) => recordInYearRange(record, yearRange)), [atlas, yearRange]);
  const visibleNodes = useMemo(() => timelineNodes.filter((node) => activeTypes.has(node.type)), [timelineNodes, activeTypes]);
  const visibleUnmapped = useMemo(() => timelineUnmapped.filter((record) => activeTypes.has(record.type)), [timelineUnmapped, activeTypes]);
  const collapsedBiography = useMemo(() => biography ? biographyExcerpt(biography.extract) : "", [biography]);
  const biographyCanExpand = Boolean(biography && collapsedBiography.length < biography.extract.length);

  const loadBiography = useCallback(async (artistId: string, suppliedRelations?: UrlRelation[], suppliedTitle?: string | null, expectedName?: string) => {
    if (biographyCache.current.has(artistId)) {
      if (requestedBiographyArtistRef.current === artistId) {
        setBiography(biographyCache.current.get(artistId) ?? null);
        setBiographyLoading(false);
      }
      return;
    }

    try {
      let relations = suppliedRelations;
      if (!relations) {
        const artistResponse = await fetch(`https://musicbrainz.org/ws/2/artist/${artistId}?inc=url-rels&fmt=json`, { headers: { Accept: "application/json" } });
        if (!artistResponse.ok) throw new Error("MusicBrainz links unavailable");
        const linkedArtist = await artistResponse.json() as { name?: string; relations?: UrlRelation[] };
        if (expectedName && (!linkedArtist.name || normalizedArtistName(linkedArtist.name) !== normalizedArtistName(expectedName))) throw new Error("MusicBrainz identity did not match the curated artist");
        relations = linkedArtist.relations ?? [];
      }

      let title = suppliedTitle || wikipediaTitleFromRelations(relations);
      if (!title) {
        const qid = relations.find((relation) => relation.type === "wikidata")?.url?.resource?.match(/Q\d+/)?.[0];
        if (qid) {
          const wikidataResponse = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=sitelinks&sitefilter=enwiki&origin=*&format=json`);
          if (wikidataResponse.ok) {
            const data = await wikidataResponse.json() as { entities?: Record<string, { sitelinks?: { enwiki?: { title?: string } } }> };
            title = data.entities?.[qid]?.sitelinks?.enwiki?.title;
          }
        }
      }

      if (!title) throw new Error("No English Wikipedia article linked");
      const nextBiography = await fetchWikipediaBio(title);
      biographyCache.current.set(artistId, nextBiography);
      if (requestedBiographyArtistRef.current === artistId) setBiography(nextBiography);
    } catch {
      biographyCache.current.set(artistId, null);
      if (requestedBiographyArtistRef.current === artistId) setBiography(null);
    } finally {
      if (requestedBiographyArtistRef.current === artistId) setBiographyLoading(false);
    }
  }, []);

  const enrichLiveAtlas = useCallback(async (artistId: string, events: MusicBrainzEvent[]) => {
    const stillCurrent = () => requestedBiographyArtistRef.current === artistId;
    const updateCurrentAtlas = (update: (current: Atlas) => Atlas) => {
      if (!stillCurrent()) return;
      setAtlas((current) => current?.artist.id === artistId ? update(current) : current);
    };

    try {
      await waitForMusicBrainz();
      if (!stillCurrent()) return;
      setLoadingStage("Loading releases and labels…");
      try {
        const releaseResponse = await fetch(`https://musicbrainz.org/ws/2/release?artist=${artistId}&inc=labels+release-groups&status=official&limit=20&fmt=json`, { headers: { Accept: "application/json" } });
        if (releaseResponse.ok) {
          const payload = await releaseResponse.json() as {
            releases?: Array<{
              id: string;
              title: string;
              date?: string;
              country?: string;
              "release-group"?: { id: string; title: string; "first-release-date"?: string; "primary-type"?: string };
              "label-info"?: Array<{ label?: { id: string; name: string } }>;
            }>;
          };
          const releaseGroups = new Map<string, AtlasRecord>();
          const labels = new Map<string, AtlasRecord>();
          for (const release of payload.releases ?? []) {
            const group = release["release-group"];
            const groupId = group?.id || release.id;
            if (!releaseGroups.has(groupId) && releaseGroups.size < 8) {
              releaseGroups.set(groupId, {
                id: groupId,
                name: group?.title || release.title,
                type: "release",
                year: yearFromDate(group?.["first-release-date"] || release.date),
                description: `${group?.["primary-type"] || "Release"} loaded from MusicBrainz. It is listed here because no source-backed recording location was returned.`,
                source: "MusicBrainz",
                sourceUrl: `https://musicbrainz.org/${group ? "release-group" : "release"}/${groupId}`,
              });
            }
            for (const info of release["label-info"] ?? []) {
              const label = info.label;
              if (label && !labels.has(label.id) && labels.size < 6) {
                labels.set(label.id, {
                  id: label.id,
                  name: label.name,
                  type: "label",
                  year: yearFromDate(release.date),
                  description: `Label credit on an official MusicBrainz release; no reliable label-office coordinate was returned.`,
                  source: "MusicBrainz",
                  sourceUrl: `https://musicbrainz.org/label/${label.id}`,
                });
              }
            }
          }
          updateCurrentAtlas((current) => ({ ...current, unmapped: mergeRecords(current.unmapped, [...releaseGroups.values(), ...labels.values()]) }));
        }
      } catch { /* Releases are an independent optional layer. */ }

      const eventSubset = events.slice(0, 3);
      for (let index = 0; index < eventSubset.length; index += 1) {
        await waitForMusicBrainz();
        if (!stillCurrent()) return;
        setLoadingStage(`Resolving performance ${index + 1} of ${eventSubset.length}…`);
        const event = eventSubset[index];
        try {
          const eventResponse = await fetch(`https://musicbrainz.org/ws/2/event/${event.id}?inc=place-rels&fmt=json`, { headers: { Accept: "application/json" } });
          if (!eventResponse.ok) continue;
          const eventDetail = await eventResponse.json() as MusicBrainzEvent & { relations?: MusicBrainzRelation[] };
          const heldAt = eventDetail.relations?.find((relation) => relation.place?.coordinates);
          const place = heldAt?.place;
          const latitude = place?.coordinates?.latitude;
          const longitude = place?.coordinates?.longitude;
          if (!place || typeof latitude !== "number" || typeof longitude !== "number") continue;
          const node: AtlasNode = {
            id: event.id,
            name: eventDetail.name || event.name,
            type: "performance",
            coordinates: [longitude, latitude],
            year: yearFromDate(eventDetail["life-span"]?.begin),
            endYear: yearFromDate(eventDetail["life-span"]?.end),
            location: [place.name, place.area?.name].filter(Boolean).join(" · "),
            description: `${eventDetail.type || "Performance"} linked to this artist and held at ${place.name}.`,
            precision: "exact venue",
            source: "MusicBrainz",
            sourceUrl: `https://musicbrainz.org/event/${event.id}`,
          };
          updateCurrentAtlas((current) => ({
            ...current,
            nodes: [...current.nodes.filter((item) => !(item.type === "performance" && item.id === node.id)), node],
            unmapped: current.unmapped?.filter((record) => !(record.type === "performance" && record.id === node.id)),
          }));
        } catch { /* A missing venue removes only this performance point. */ }
      }
    } finally {
      if (stillCurrent()) setLoadingStage(null);
    }
  }, []);

  const loadArtist = useCallback(async (result: SearchResult | { id: string; name: string }, navigate = true) => {
    requestedBiographyArtistRef.current = result.id;
    setQuery(""); setResults([]); setDetail(null); setHoverCard(null); setBiography(null); setBiographyLoading(true); setBiographyExpanded(false); setUnmappedExpanded(false); hoveredNodeRef.current = null; setLoadingStage("Locating artist…");
    if (navigate) {
      const previousName = currentArtistRef.current?.name || null;
      setPreviousArtistName(previousName);
      window.history.pushState({ artist: result.id, previousArtistName: previousName }, "", `?artist=${result.id}`);
    }

    const curated = atlasData[result.id];
    if (curated) {
      currentArtistRef.current = curated.artist;
      setAtlas(curated);
      setLoadingStage(null);
      void loadBiography(result.id, undefined, undefined, curated.artist.name);
      return;
    }

    try {
      const baseUrl = `https://musicbrainz.org/ws/2/artist/${result.id}?inc=url-rels+artist-rels+label-rels+place-rels+event-rels&fmt=json`;
      const artistResponse = await fetch(baseUrl, { headers: { Accept: "application/json" } });
      if (!artistResponse.ok) throw new Error("Artist lookup failed");
      const artist = await artistResponse.json();
      const relations = (artist.relations ?? []) as MusicBrainzRelation[];
      const country = artist.country || artist.area?.["iso-3166-1-codes"]?.[0] || "";
      let center = countryCenters[country] || [0, 20] as [number, number];
      let hasGeographicLocation = Boolean(countryCenters[country]);
      let locationSource: AtlasNode["source"] = "MusicBrainz";
      let locationName = artist.area?.name || artist["begin-area"]?.name || artist.country || "Approximate location";
      let wikipediaTitle: string | null = wikipediaTitleFromRelations(relations);

      setLoadingStage("Resolving places…");
      const wikidataRelation = relations.find((relation) => relation.type === "wikidata");
      const qid = wikidataRelation?.url?.resource?.match(/Q\d+/)?.[0];
      if (qid) {
        try {
          const wikiResponse = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims%7Cdescriptions%7Csitelinks&sitefilter=enwiki&languages=en&origin=*&format=json`);
          const entity = (await wikiResponse.json()).entities?.[qid];
          wikipediaTitle ||= entity?.sitelinks?.enwiki?.title || null;
          const coordinate = entity?.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
          if (coordinate) {
            center = [coordinate.longitude, coordinate.latitude];
            locationSource = "Wikidata";
            hasGeographicLocation = true;
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
              hasGeographicLocation = true;
            }
          }
        } catch { /* MusicBrainz area remains a valid fallback. */ }
      }

      const primaryNode: AtlasNode = {
        id: artist.id, name: artist.name, type: "artist", coordinates: center,
        year: Number(artist["life-span"]?.begin?.slice(0, 4)) || undefined,
        endYear: Number(artist["life-span"]?.end?.slice(0, 4)) || undefined,
        location: locationName,
        description: artist.disambiguation || `${artist.type || "Artist"} connected to ${locationName}. Live public data can be incomplete.`,
        precision: locationSource === "Wikidata" ? "city" : country ? "country" : "approximate",
        source: locationSource,
        sourceUrl: `https://musicbrainz.org/artist/${artist.id}`,
      };
      const nodes: AtlasNode[] = hasGeographicLocation ? [primaryNode] : [];
      const unmapped: AtlasRecord[] = [];

      relations.filter((relation) => relation.artist).slice(0, 7).forEach((relation) => {
        const relatedArtist = relation.artist as RelatedEntity;
        const description = `${relation.type || "Artist"} relationship with ${artist.name}. Select this artist to explore further.`;
        const node = countryNode(relatedArtist, "artist", description);
        if (node) nodes.push(node); else unmapped.push({ id: relatedArtist.id, name: relatedArtist.name, type: "artist", year: yearFromDate(relation.begin), endYear: yearFromDate(relation.end), description: `${description} No usable geographic area was returned.`, source: "MusicBrainz", sourceUrl: `https://musicbrainz.org/artist/${relatedArtist.id}` });
      });
      relations.filter((relation) => relation.label).slice(0, 5).forEach((relation) => {
        const label = relation.label as RelatedEntity;
        const description = `${relation.type || "Label"} connection listed by MusicBrainz.`;
        const node = countryNode(label, "label", description);
        if (node) nodes.push(node); else unmapped.push({ id: label.id, name: label.name, type: "label", year: yearFromDate(relation.begin), endYear: yearFromDate(relation.end), description: `${description} No reliable office coordinate was returned.`, source: "MusicBrainz", sourceUrl: `https://musicbrainz.org/label/${label.id}` });
      });
      relations.filter((relation) => relation.place).slice(0, 5).forEach((relation) => {
        const node = placeNode(relation, artist.name);
        if (node) nodes.push(node); else if (relation.place) unmapped.push({ id: relation.place.id, name: relation.place.name, type: "place", year: yearFromDate(relation.begin), endYear: yearFromDate(relation.end), description: `${relation.type || "Place"} relationship with ${artist.name}; MusicBrainz returned no coordinates.`, source: "MusicBrainz", sourceUrl: `https://musicbrainz.org/place/${relation.place.id}` });
      });
      const relatedEvents = relations.filter((relation) => relation.event).map((relation) => relation.event as MusicBrainzEvent).slice(0, 6);
      unmapped.push(...relatedEvents.map(eventRecord));

      const nextAtlas: Atlas = {
        artist: { id: artist.id, name: artist.name, subtitle: artist.disambiguation || `${artist.type || "Artist"} from ${locationName}`, years: yearsFor(artist), country: artist.country || artist.area?.name || "Unknown area" },
        center, nodes, unmapped: mergeRecords([], unmapped),
      };
      currentArtistRef.current = nextAtlas.artist;
      setAtlas(nextAtlas);
      setLoadingStage("Loading releases and performances…");
      void loadBiography(artist.id, relations, wikipediaTitle);
      void enrichLiveAtlas(artist.id, relatedEvents);
    } catch {
      setLoadingStage(null);
      const fallbackAtlas: Atlas = {
        artist: { id: result.id, name: result.name, subtitle: "Live data is temporarily unavailable", years: "Dates unavailable", country: "Location unavailable" },
        center: [0, 20],
        nodes: [],
      };
      currentArtistRef.current = fallbackAtlas.artist;
      setAtlas(fallbackAtlas);
      setBiographyLoading(false);
    }
  }, [enrichLiveAtlas, loadBiography]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("artist");
    if (id) queueMicrotask(() => loadArtist({ id, name: "Artist" }, false));
    const onPopState = (event: PopStateEvent) => {
      const artistId = new URLSearchParams(window.location.search).get("artist");
      if (artistId) {
        setPreviousArtistName(typeof event.state?.previousArtistName === "string" ? event.state.previousArtistName : null);
        loadArtist({ id: artistId, name: "Artist" }, false);
      } else {
        currentArtistRef.current = null;
        requestedBiographyArtistRef.current = null;
        setPreviousArtistName(null);
        setAtlas(null);
        setDetail(null);
        setBiography(null);
        setBiographyLoading(false);
        setBiographyExpanded(false);
        setUnmappedExpanded(false);
      }
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
        const features = atlasPointFeatures(nodes);
        const lines = atlasMap.__atlasAnchor ? nodes.slice(1).map((node) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [atlasMap.__atlasAnchor as [number, number], node.coordinates] } })) : [];
        map.addSource("atlas-lines", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addSource("atlas-points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "atlas-lines", type: "line", source: "atlas-lines", paint: { "line-color": "#ff6b4a", "line-width": 1.2, "line-opacity": 0.52, "line-dasharray": [2, 2] } });
        map.addLayer({ id: "atlas-halo", type: "circle", source: "atlas-points", paint: { "circle-radius": 13, "circle-color": ["match", ["get", "type"], "artist", "#ff6b4a", "place", "#ffd166", "label", "#9c8cff", "release", "#58d6b3", "#6bb7ff"], "circle-opacity": 0.12 } });
        map.addLayer({ id: "atlas-points", type: "circle", source: "atlas-points", paint: { "circle-radius": ["case", [">", ["get", "stackCount"], 1], ["interpolate", ["linear"], ["zoom"], 1, 9, 6, 13], ["interpolate", ["linear"], ["zoom"], 1, 4, 6, 8]], "circle-color": ["match", ["get", "type"], "artist", "#ff6b4a", "place", "#ffd166", "label", "#9c8cff", "release", "#58d6b3", "#6bb7ff"], "circle-stroke-color": atlasMap.__theme === "light" ? "#f4f0e7" : "#131816", "circle-stroke-width": 2 } });
        map.addLayer({ id: "atlas-stack-counts", type: "symbol", source: "atlas-points", filter: [">", ["get", "stackCount"], 1], layout: { "text-field": ["to-string", ["get", "stackCount"]], "text-size": 10, "text-allow-overlap": true, "text-ignore-placement": true }, paint: { "text-color": "#ffffff", "text-halo-color": "rgba(0,0,0,.28)", "text-halo-width": 1 } });
        (map.getSource("atlas-points") as { setData: (data: object) => void }).setData({ type: "FeatureCollection", features });
        (map.getSource("atlas-lines") as { setData: (data: object) => void }).setData({ type: "FeatureCollection", features: lines });
      });
      const positionHoverCard = (node: AtlasNode) => {
        const point = map.project(node.coordinates);
        const { clientWidth, clientHeight } = map.getContainer();
        const placement: HoverPlacement = point.x > clientWidth - 370 ? "left" : point.y > clientHeight - 250 ? "above" : point.y < 205 ? "below" : "right";
        setHoverCard({ node, x: point.x, y: point.y, placement });
      };
      map.on("mousemove", "atlas-points", (event) => {
        if (hoverHideTimer.current !== null) window.clearTimeout(hoverHideTimer.current);
        const id = event.features?.[0]?.properties?.id;
        const node = (map as AtlasMap).__atlasNodes?.find((item) => item.id === id);
        if (!node) return;
        hoveredNodeRef.current = node;
        map.getCanvas().style.cursor = "pointer";
        positionHoverCard(node);
      });
      map.on("mouseleave", "atlas-points", () => {
        map.getCanvas().style.cursor = "";
        hoverHideTimer.current = window.setTimeout(() => {
          hoveredNodeRef.current = null;
          setHoverCard(null);
        }, 180);
      });
      map.on("move", () => {
        if (hoveredNodeRef.current) positionHoverCard(hoveredNodeRef.current);
      });
      map.on("click", "atlas-points", (event) => {
        const id = event.features?.[0]?.properties?.id;
        const node = (mapRef.current as AtlasMap).__atlasNodes?.find((item) => item.id === id);
        if (node && window.matchMedia("(hover: none)").matches) setDetail(node);
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
      const features = atlasPointFeatures(visibleNodes);
      const anchor = atlas?.nodes[0]?.coordinates;
      const lines = anchor ? visibleNodes.slice(1).map((node) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: [anchor, node.coordinates] } })) : [];
      (map.getSource("atlas-points") as { setData: (data: object) => void } | undefined)?.setData({ type: "FeatureCollection", features });
      (map.getSource("atlas-lines") as { setData: (data: object) => void } | undefined)?.setData({ type: "FeatureCollection", features: lines });
      if (atlas) {
        const uniqueCoordinates = [...new Map(visibleNodes.map((node) => [node.coordinates.join(","), node.coordinates])).values()];
        if (uniqueCoordinates.length <= 1) {
          map.flyTo({ center: uniqueCoordinates[0] || atlas.center, zoom: uniqueCoordinates.length ? 5.2 : 2.2, duration: 1400, essential: true });
        } else {
          const longitudes = uniqueCoordinates.map((coordinate) => coordinate[0]);
          const latitudes = uniqueCoordinates.map((coordinate) => coordinate[1]);
          const width = map.getContainer().clientWidth;
          const mobile = width < 801;
          const compact = width < 1100;
          map.fitBounds(
            [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]],
            {
              padding: mobile
                ? { top: 85, right: 28, bottom: 180, left: 28 }
                : compact
                  ? { top: 100, right: 55, bottom: 145, left: Math.min(350, width * .34) }
                  : { top: 105, right: 270, bottom: 150, left: 470 },
              maxZoom: 7.5,
              duration: 1600,
              essential: true,
            },
          );
        }
      }
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

  useEffect(() => {
    if (!aboutOpen) return;
    modalCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAboutOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [aboutOpen]);

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

  const updateDiagnostic = (result: DiagnosticResult) => {
    setDiagnostics((current) => current.map((item) => item.id === result.id ? result : item));
  };

  const runJsonCheck = async (
    id: string,
    url: string,
    validate: (data: Record<string, unknown>) => string,
  ) => {
    const template = initialDiagnostics.find((item) => item.id === id)!;
    const started = performance.now();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as Record<string, unknown>;
      const detail = validate(data);
      updateDiagnostic({ ...template, status: "pass", summary: "Valid response received.", duration: Math.round(performance.now() - started), detail });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown browser error";
      updateDiagnostic({ ...template, status: "fail", summary: "Expected data was not available.", duration: Math.round(performance.now() - started), detail: message === "AbortError" ? "Request timed out after 8 seconds." : message });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const runDiagnostics = async () => {
    if (diagnosticsRunning) return;
    setDiagnosticsRunning(true);
    setDiagnostics(initialDiagnostics.map((item) => item.status === "not-used" ? item : { ...item, status: "running", detail: undefined, duration: undefined }));

    await runJsonCheck("mb-search", "https://musicbrainz.org/ws/2/artist?query=artist%3AAutechre&fmt=json&limit=1", (data) => {
      const artists = data.artists as Array<{ id?: string; name?: string }> | undefined;
      if (!artists?.[0]?.id || !artists[0].name) throw new Error("Response did not contain an artist name and MBID.");
      return `${artists.length} result received; first match: ${artists[0].name} (${artists[0].id}).`;
    });

    await new Promise((resolve) => window.setTimeout(resolve, 1100));
    const diagnosticArtistId = atlas?.artist.id || "6514cffa-fbe0-4965-ad88-e998ead8a82a";
    const diagnosticArtistName = atlas?.artist.name || "Fela Kuti";
    await runJsonCheck("mb-lookup", `https://musicbrainz.org/ws/2/artist/${diagnosticArtistId}?inc=url-rels+artist-rels+label-rels+place-rels+event-rels&fmt=json`, (data) => {
      if (!data.id || !data.name || !Array.isArray(data.relations)) throw new Error("Response was missing identity or relationship fields.");
      if (normalizedArtistName(String(data.name)) !== normalizedArtistName(diagnosticArtistName)) throw new Error(`Identity mismatch: expected ${diagnosticArtistName}, received ${String(data.name)}.`);
      return `${String(data.name)} returned with ${(data.relations as unknown[]).length} relationships.`;
    });

    await new Promise((resolve) => window.setTimeout(resolve, 1100));
    await runJsonCheck("mb-releases", `https://musicbrainz.org/ws/2/release?artist=${diagnosticArtistId}&inc=labels+release-groups&status=official&limit=5&fmt=json`, (data) => {
      const releases = data.releases as Array<{ id?: string; title?: string }> | undefined;
      if (!Array.isArray(releases)) throw new Error("Response was missing the release list.");
      return `${releases.length} bounded release records returned for enrichment.`;
    });

    await runJsonCheck("wikidata", "https://www.wikidata.org/w/api.php?action=wbgetentities&ids=Q60&props=claims%7Clabels&languages=en&origin=*&format=json", (data) => {
      const entities = data.entities as Record<string, { labels?: { en?: { value?: string } }; claims?: { P625?: unknown[] } }> | undefined;
      const entity = entities?.Q60;
      if (!entity?.labels?.en?.value || !entity.claims?.P625?.length) throw new Error("Response was missing the label or P625 coordinates.");
      return `${entity.labels.en.value} returned with a P625 coordinate claim.`;
    });

    await runJsonCheck("wikipedia", "https://en.wikipedia.org/api/rest_v1/page/summary/Fela_Kuti", (data) => {
      const contentUrls = data.content_urls as { desktop?: { page?: string } } | undefined;
      if (!data.title || typeof data.extract !== "string" || data.extract.length < 80 || !contentUrls?.desktop?.page) throw new Error("Response was missing biography text or its canonical article URL.");
      return `${String(data.title)} returned a ${data.extract.length}-character biography summary.`;
    });

    await runJsonCheck("map", "https://tiles.openfreemap.org/styles/bright", (data) => {
      const layers = data.layers as unknown[] | undefined;
      if (!data.version || !Array.isArray(layers) || layers.length === 0) throw new Error("Response was not a valid MapLibre style document.");
      return `Style specification v${String(data.version)} returned with ${layers.length} layers.`;
    });

    const curatedTemplate = initialDiagnostics.find((item) => item.id === "curated")!;
    const curatedAtlases = Object.values(atlasData);
    const curatedNodes = curatedAtlases.flatMap((item) => item.nodes);
    const invalidCoordinates = curatedNodes.filter((node) => Math.abs(node.coordinates[0]) > 180 || Math.abs(node.coordinates[1]) > 90);
    updateDiagnostic({
      ...curatedTemplate,
      status: curatedAtlases.length > 0 && invalidCoordinates.length === 0 ? "pass" : "fail",
      summary: invalidCoordinates.length === 0 ? "Bundled records are internally valid." : "One or more bundled coordinates are invalid.",
      duration: 0,
      detail: `${curatedAtlases.length} artists and ${curatedNodes.length} mapped entities checked; ${invalidCoordinates.length} invalid coordinates.`,
    });
    setDiagnosticsRanAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    setDiagnosticsRunning(false);
  };

  const openAbout = (tab: ModalTab = "about") => {
    setModalTab(tab);
    setAboutOpen(true);
  };

  const cancelHoverClose = () => {
    if (hoverHideTimer.current !== null) window.clearTimeout(hoverHideTimer.current);
  };

  const closeHoverCard = () => {
    cancelHoverClose();
    hoveredNodeRef.current = null;
    setHoverCard(null);
  };

  const goHome = () => {
    window.history.pushState({ home: true }, "", "/");
    currentArtistRef.current = null;
    requestedBiographyArtistRef.current = null;
    setPreviousArtistName(null);
    setAtlas(null);
    setDetail(null);
    setBiography(null);
    setBiographyLoading(false);
    setBiographyExpanded(false);
    setUnmappedExpanded(false);
    closeHoverCard();
  };

  return (
    <main className={`atlas-shell ${theme}`}>
      <div ref={mapContainer} className="map" aria-label="Interactive world map of musical connections" />
      <div className="map-vignette" />

      <header className="topbar">
        <button className="brand" onClick={goHome} aria-label="Return to Music Atlas home">
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
        <div className="topbar-actions">
          <button className="home-trigger" onClick={goHome} aria-label="Go to Music Atlas home"><span aria-hidden="true">⌂</span><span>Home</span></button>
          <button className="about-trigger" onClick={() => openAbout()} aria-label="About Music Atlas and its data"><span aria-hidden="true">i</span><span>About</span></button>
          <div className="theme-toggle" role="group" aria-label="Color theme">
            <button className={theme === "light" ? "active" : ""} onClick={() => switchTheme("light")} aria-pressed={theme === "light"} aria-label="Use light theme"><span aria-hidden="true">☀</span><span className="theme-label">Light</span></button>
            <button className={theme === "dark" ? "active" : ""} onClick={() => switchTheme("dark")} aria-pressed={theme === "dark"} aria-label="Use dark theme"><span aria-hidden="true">◐</span><span className="theme-label">Dark</span></button>
          </div>
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
          <button className="back" onClick={() => { window.history.back(); }}>← <span>{previousArtistName ? `Back to ${previousArtistName}` : "Back to atlas"}</span></button>
          <div className="artist-title"><div className="title-pulse" /><div><p>EXPLORING</p><h1>{atlas.artist.name}</h1></div></div>
          <p className="artist-subtitle">{atlas.artist.subtitle}</p>
          <div className="artist-facts"><span>{atlas.artist.country}</span><span>{atlas.artist.years}</span><span>{timelineNodes.length}/{timelineNodes.length + timelineUnmapped.length} mapped</span></div>
          {loadingStage && <div className="progressive"><span className="search-spinner" /> {loadingStage}</div>}
          {biographyLoading && !loadingStage && <div className="biography-loading"><span className="search-spinner" /> Finding linked Wikipedia biography…</div>}
          {biography && (
            <section className="artist-biography" aria-label={`Wikipedia biography for ${atlas.artist.name}`}>
              <div className="biography-heading"><span>FROM WIKIPEDIA</span><a href={biography.url} target="_blank" rel="noreferrer">Read article ↗</a></div>
              <p id="artist-biography-text" className={biographyExpanded ? "expanded" : ""}>{biographyExpanded ? biography.extract : collapsedBiography}</p>
              <div className="biography-footer">
                {biographyCanExpand && <button onClick={() => setBiographyExpanded((expanded) => !expanded)} aria-expanded={biographyExpanded} aria-controls="artist-biography-text">{biographyExpanded ? "Show less ↑" : "Show more ↓"}</button>}
                <div className="biography-license">Text from <a href={biography.url} target="_blank" rel="noreferrer">{biography.title}</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA</a></div>
              </div>
            </section>
          )}
          {timelineUnmapped.length > 0 && (
            <section className="unmapped-data">
              <button className="unmapped-toggle" onClick={() => setUnmappedExpanded((expanded) => !expanded)} aria-expanded={unmappedExpanded} aria-controls="unmapped-records">
                <span><small>LOADED, NOT MAPPED</small><strong>{timelineUnmapped.length} records without coordinates</strong></span><span>{unmappedExpanded ? "↑" : "↓"}</span>
              </button>
              {unmappedExpanded && (
                <div id="unmapped-records" className="unmapped-records">
                  <p>These records remain off the map because the source did not provide a defensible coordinate.</p>
                  {(Object.entries(typeMeta) as [EntityType, { label: string; color: string }][]).map(([type, meta]) => {
                    const records = visibleUnmapped.filter((record) => record.type === type).slice(0, 6);
                    if (records.length === 0) return null;
                    return <div className="unmapped-group" key={type}><h3><span style={{ background: meta.color }} />{meta.label}</h3>{records.map((record) => <a key={`${record.type}:${record.id}`} href={record.sourceUrl} target="_blank" rel="noreferrer"><span>{record.name}</span><small>{record.year || "Date unknown"} · {record.source} ↗</small></a>)}</div>;
                  })}
                </div>
              )}
            </section>
          )}
          {!loadingStage && atlas.nodes.length === 0 && timelineUnmapped.length > 0 && <div className="empty-state">No source-backed map coordinates were available. Related records are listed above instead of being placed approximately.</div>}
          {!loadingStage && atlas.nodes.length === 0 && timelineUnmapped.length === 0 && <div className="empty-state">This artist has too little mappable public data right now. Try one of the curated stories.</div>}
        </section>
      )}

      <aside className={`layers-panel ${mobileFilters ? "open" : ""}`}>
        <div className="panel-heading"><span>MAP LAYERS</span><button onClick={() => setMobileFilters(false)}>×</button></div>
        {(Object.entries(typeMeta) as [EntityType, { label: string; color: string }][]).map(([type, meta]) => {
          const mappedCount = timelineNodes.filter((node) => node.type === type).length;
          const totalCount = mappedCount + timelineUnmapped.filter((record) => record.type === type).length;
          return <button key={type} className={activeTypes.has(type) ? "active" : ""} onClick={() => toggleType(type)}>
            <span className="layer-dot" style={{ "--dot": meta.color } as React.CSSProperties} />
            <span>{meta.label}</span><small title={`${mappedCount} mapped of ${totalCount} loaded`}>{mappedCount}/{totalCount}</small>
            <span className="check">{activeTypes.has(type) ? "✓" : ""}</span>
          </button>;
        })}
        <div className="source-key"><span>◒</span><p><strong>DATA LAYERS</strong> Live + curated sources</p></div>
        <div className="stack-key"><span>3</span><p>Numbered dots contain overlapping records</p></div>
        <div className="unmapped-key"><span>4/10</span><p>Mapped records / total loaded</p></div>
      </aside>

      {hoverCard && (
        <aside
          className={`map-popover ${hoverCard.placement}`}
          style={{ left: hoverCard.x, top: hoverCard.y }}
          onMouseEnter={cancelHoverClose}
          onMouseLeave={closeHoverCard}
          role="dialog"
          aria-label={`${hoverCard.node.name} details`}
        >
          <button className="popover-close" onClick={closeHoverCard} aria-label="Close details">×</button>
          <div className="detail-type"><span style={{ background: typeMeta[hoverCard.node.type].color }} />{hoverCard.node.type.toUpperCase()}</div>
          <h2>{hoverCard.node.name}</h2>
          <p className="detail-location">⌖ {hoverCard.node.location}</p>
          <p className="popover-description">{hoverCard.node.description}</p>
          <div className="popover-facts">
            <span><small>DATE</small><strong>{hoverCard.node.year ? `${hoverCard.node.year}${hoverCard.node.endYear ? `—${hoverCard.node.endYear}` : ""}` : "Unknown"}</strong></span>
            <span><small>PRECISION</small><strong>≈ {hoverCard.node.precision}</strong></span>
          </div>
          <div className="popover-source"><span>Source</span><strong className={hoverCard.node.source === "Curated" ? "curated" : ""}>{hoverCard.node.source === "Curated" ? "◆ " : "↗ "}{hoverCard.node.source}</strong></div>
          <div className="popover-actions">
            {hoverCard.node.sourceUrl && <a href={hoverCard.node.sourceUrl} target="_blank" rel="noreferrer">Original source ↗</a>}
            {hoverCard.node.type === "artist" && hoverCard.node.id !== atlas?.artist.id && <button onClick={() => loadArtist({ id: hoverCard.node.id, name: hoverCard.node.name })}>Explore artist →</button>}
          </div>
        </aside>
      )}

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

      {aboutOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAboutOpen(false); }}>
          <section className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <header className="modal-header">
              <div><p>MUSIC ATLAS / FIELD GUIDE</p><h2 id="about-title">Follow the data trail.</h2></div>
              <button ref={modalCloseRef} className="modal-close" onClick={() => setAboutOpen(false)} aria-label="Close About and Data">×</button>
            </header>
            <div className="modal-tabs" role="tablist" aria-label="About and diagnostics">
              <button role="tab" aria-selected={modalTab === "about"} className={modalTab === "about" ? "active" : ""} onClick={() => setModalTab("about")}>About & data</button>
              <button role="tab" aria-selected={modalTab === "diagnostics"} className={modalTab === "diagnostics" ? "active" : ""} onClick={() => setModalTab("diagnostics")}><span className="diagnostic-pulse" />Diagnostics</button>
            </div>

            {modalTab === "about" ? (
              <div className="modal-body about-content">
                <section className="about-lead"><p className="eyebrow">WHAT THIS IS</p><h3>A geographic lens on musical history.</h3><p>Search for an artist, then explore the people, places, labels, releases, and performances around them. Filter the loaded story by time, follow related artists, and inspect the source and geographic precision of every point.</p></section>
                <section className="capability-grid" aria-label="Application capabilities">
                  <div><span>01</span><strong>Search</strong><p>Find canonical artist identities without accounts or API keys.</p></div>
                  <div><span>02</span><strong>Map</strong><p>Explore source-backed places and relationships across the world.</p></div>
                  <div><span>03</span><strong>Filter</strong><p>Switch entity layers and narrow visible data by year or decade.</p></div>
                  <div><span>04</span><strong>Trace</strong><p>See provenance, precision, and original-source links for mapped facts.</p></div>
                </section>
                <section className="data-section">
                  <div className="section-heading"><span>DATA PROVENANCE</span><span>EXACT CURRENT USAGE</span></div>
                  <article className="source-card live"><div className="source-number">01</div><div><h4>MusicBrainz <span>LIVE API</span></h4><p>Artist search supplies identity and disambiguation. A bounded enrichment pass loads artist, label, place, and event relationships; up to 20 official releases provide a small set of release groups and label credits; and at most three events are followed to resolve venue coordinates.</p><code>musicbrainz.org/ws/2/artist · release · event</code></div></article>
                  <article className="source-card live"><div className="source-number">02</div><div><h4>Wikidata <span>LIVE API</span></h4><p>Only queried when MusicBrainz links an artist to Wikidata. The app reads P625 coordinates; when needed, it follows P19 birthplace to retrieve that place’s English label and coordinates. It does not run broad SPARQL queries.</p><code>wikidata.org/w/api.php · wbgetentities</code></div></article>
                  <article className="source-card live wikipedia-source"><div className="source-number">03</div><div><h4>Wikipedia <span>LIVE API</span></h4><p>When MusicBrainz or Wikidata links an English Wikipedia article, the app requests its plain-text lead summary and canonical article URL. The biography loads independently and is attributed under CC BY-SA.</p><code>en.wikipedia.org/api/rest_v1/page/summary</code></div></article>
                  <article className="source-card map-source"><div className="source-number">04</div><div><h4>OpenFreeMap <span>LIVE TILES</span></h4><p>Provides the light and dark MapLibre style documents and basemap tiles. It contributes geography and place labels, but no artist or music facts.</p><code>tiles.openfreemap.org/styles/bright|dark</code></div></article>
                  <article className="source-card curated-source"><div className="source-number">05</div><div><h4>Curated Atlas <span>BUNDLED DATA</span></h4><p>Supplies the featured artist stories, editorial descriptions, selected studios and venues, notable performances, releases, and corrected coordinates. These facts are marked “Curated” in detail panels.</p><code>{Object.keys(atlasData).length} artists · {Object.values(atlasData).flatMap((item) => item.nodes).length} mapped entities</code></div></article>
                  <article className="source-card inactive"><div className="source-number">06</div><div><h4>Cover Art Archive <span>NOT CURRENTLY CALLED</span></h4><p>The architecture allows release artwork later, but this build does not request Cover Art Archive images or plot MusicBrainz releases without geographic evidence.</p><code>No browser request in the current build</code></div></article>
                </section>
                <aside className="precision-note"><strong>How locations are interpreted</strong><p>Wikidata and MusicBrainz venue coordinates are shown as source-backed points. MusicBrainz country-only areas are visibly marked at country precision. Releases, labels, events, and other entities without defensible coordinates remain available in “Loaded, not mapped” instead of being invented or scattered.</p></aside>
                <button className="open-diagnostics" onClick={() => setModalTab("diagnostics")}>Run source diagnostics <span>→</span></button>
              </div>
            ) : (
              <div className="modal-body diagnostics-content">
                <div className="diagnostics-intro"><div><p className="eyebrow">DIAGNOSTIC MODE</p><h3>Verify the live data path.</h3><p>Runs small browser-side checks against the same public endpoints the atlas expects. No credentials or personal data are sent.</p></div><button onClick={runDiagnostics} disabled={diagnosticsRunning}>{diagnosticsRunning ? "Checking…" : diagnosticsRanAt ? "Run again" : "Run diagnostics"}</button></div>
                <div className="diagnostic-summary"><span>{diagnosticsRunning ? "CHECKS IN PROGRESS" : diagnosticsRanAt ? `LAST RUN ${diagnosticsRanAt}` : "NOT YET RUN"}</span><strong>{diagnostics.filter((item) => item.status === "pass").length}/{diagnostics.filter((item) => item.status !== "not-used").length} passing</strong></div>
                <div className="diagnostic-list">
                  {diagnostics.map((item) => (
                    <article key={item.id} className={`diagnostic-row ${item.status}`}>
                      <div className="diagnostic-status" aria-label={item.status}>{item.status === "pass" ? "✓" : item.status === "fail" ? "!" : item.status === "running" ? "↻" : item.status === "not-used" ? "—" : "·"}</div>
                      <div className="diagnostic-copy"><div><strong>{item.name}</strong><span>{item.provider}</span></div><p>{item.detail || item.summary}</p><code>{item.endpoint}</code></div>
                      <div className="diagnostic-time">{item.duration === undefined ? "" : item.duration === 0 ? "LOCAL" : `${item.duration} ms`}</div>
                    </article>
                  ))}
                </div>
                <p className="diagnostic-footnote">A failed check usually means a public service is unavailable, rate-limiting requests, or blocking cross-origin access. Other atlas layers should continue working independently.</p>
              </div>
            )}
          </section>
        </div>
      )}

      <footer className="statusbar"><span><i /> LIVE SOURCES AVAILABLE</span><span>MusicBrainz · Wikidata · Wikipedia · Curated Atlas</span><button onClick={() => openAbout()}>About the data ↗</button></footer>
    </main>
  );
}
