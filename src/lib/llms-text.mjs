const guideLinks = {
  GR: [
    ['Athens radio stations guide', '/guides/radiofonikoi-stathmoi-athina/'],
    ['Greek radio online guide', '/guides/greek-radio-online/'],
    ['Find Greek radio stations', '/guides/find-greek-radio-stations/'],
  ],
  HR: [['Croatian radio guide', '/guides/koji-hrvatski-radio-slusati/']],
};

export function llmsText(site, stations) {
  const root = site.siteUrl.replace(/\/$/, '');
  const link = (label, path, description) => `- [${label}](${root}${path}): ${description}`;
  const defaultLocale = site.defaultLocale || 'en';
  const otherLocales = (site.locales || []).filter(locale => locale !== defaultLocale);
  const featured = [...stations]
    .filter(station => station.slug && station.name)
    .sort((a, b) => Number(b.votes || 0) - Number(a.votes || 0))
    .slice(0, 5);

  return [
    `# ${site.siteName}`,
    '',
    `> Browse and listen to live radio stations from ${site.countryName}. Station pages include available streams, locations, genres, and now-playing information when supplied by the broadcaster.`,
    '',
    '## Explore',
    '',
    link('All radio stations', '/', `Browse stations in ${site.countryName}.`),
    link('Top-rated stations', '/top-rated/', 'Browse stations by community votes.'),
    link('Browse by city', '/city/', 'Find stations by city.'),
    link('Browse by region', '/region/', 'Find stations by region.'),
    link('Browse by genre', '/genres/', 'Find stations by music or programme genre.'),
    link('High-quality streams', '/high-quality/', 'Browse stations with higher-bitrate streams.'),
    link('Live tracks', '/live-tracks/', 'See current tracks from stations with supported metadata.'),
    '',
    '## Listening guides',
    '',
    link('All guides', '/guides/', 'Browse guides to finding and listening to radio.'),
    link('Find your next radio station', '/guides/find-your-radio-station/', 'Tips for discovering stations.'),
    ...(guideLinks[site.countryCode] || []).map(([name, path]) => link(name, path, 'Country-specific listening guide.')),
    '',
    '## Station profiles',
    '',
    ...featured.map(station => link(station.name, `/stations/${station.slug}/`, 'Live stream and station details.')),
    '',
    '## Optional',
    '',
    ...otherLocales.map(locale => link(`${locale.toUpperCase()} homepage`, `/${locale}/`, 'Browse the localized site.')),
    link('Sitemap', '/sitemap.xml', 'Complete list of published pages.'),
    '',
  ].join('\n');
}
