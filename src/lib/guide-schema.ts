/** Connect a guide article to its localized page and visible guide navigation. */
export function guideSchema(article: Record<string, any>, guidesUrl: string, guidesLabel: string) {
  const url = article.url;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { ...article, '@id': `${url}#article`, mainEntityOfPage: { '@id': url } },
      {
        '@type': 'WebPage', '@id': url, url,
        name: article.headline, description: article.description, inLanguage: article.inLanguage,
        mainEntity: { '@id': `${url}#article` },
        primaryImageOfPage: article.image,
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: guidesLabel, item: guidesUrl },
          { '@type': 'ListItem', position: 2, name: article.headline, item: url },
        ],
      },
    ],
  };
}
