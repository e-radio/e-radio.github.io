export interface StationContent {
  about: string[];
  faqs?: Array<{ question: string; answer: string }>;
  programs?: Array<{ name: string; description?: string }>;
}

interface SharedStationContent {
  schedule?: {
    timezone: string;
    source_url: string;
    groups: Array<{
      days: number[];
      entries: Array<{ start: string; end: string; name: string }>;
    }>;
  };
}

// Editorial text stays separate from imported station records and UI dictionaries.
const files = import.meta.glob<StationContent>('../data/station-content/*/*.json', {
  eager: true,
  import: 'default',
});

export function getStationContent(stationUuid: string, locale: string) {
  const base = `../data/station-content/${stationUuid}/`;
  const translated = files[`${base}${locale}.json`];
  const content = translated || files[`${base}en.json`];
  const shared = files[`${base}shared.json`] as unknown as SharedStationContent | undefined;
  return content ? { content, language: translated ? locale : 'en', schedule: shared?.schedule } : null;
}
