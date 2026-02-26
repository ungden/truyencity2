/**
 * Render a JSON-LD structured data block.
 * Server component — safe to include in any page.
 */

interface JsonLdProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/* ─────────────────────────── Pre-built schemas ─────────────────────────── */

export function WebsiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "TruyenCity",
        url: "https://truyencity.com",
        description:
          "Nền tảng đọc truyện online miễn phí hàng đầu Việt Nam. Hàng ngàn bộ truyện tiên hiệp, huyền huyễn, đô thị, ngôn tình.",
        inLanguage: "vi",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: "https://truyencity.com/browse?q={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "TruyenCity",
        url: "https://truyencity.com",
        logo: "https://truyencity.com/icons/icon-512x512.png",
        sameAs: [],
      }}
    />
  );
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

interface BookJsonLdProps {
  name: string;
  author: string;
  description: string;
  genre?: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
  url: string;
  ratingValue?: number;
  ratingCount?: number;
}

export function BookJsonLd({
  name,
  author,
  description,
  genre,
  datePublished,
  dateModified,
  image,
  url,
  ratingValue,
  ratingCount,
}: BookJsonLdProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Book",
    name,
    author: {
      "@type": "Person",
      name: author,
    },
    description,
    url,
    inLanguage: "vi",
  };

  if (genre) data.genre = genre;
  if (datePublished) data.datePublished = datePublished;
  if (dateModified) data.dateModified = dateModified;
  if (image) data.image = image;

  if (ratingValue && ratingCount && ratingCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: ratingValue.toFixed(1),
      ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return <JsonLd data={data} />;
}
