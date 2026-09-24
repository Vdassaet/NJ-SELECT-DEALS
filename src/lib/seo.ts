export const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.njselectdeals.com');

export const STORE_INFO = {
  name: 'NJ Select Deals',
  legalName: 'NJ Select Deals LLC',
  description:
    'NJ Select Deals is your direct single-store e-commerce destination for authentic, premium shampoos, hair care, skin care, creams, artisanal chocolates, and personal care essentials.',
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  telephone: '+1-800-555-3325',
  email: 'support@njselectdeals.com',
  address: {
    streetAddress: '100 Route 17 North',
    addressLocality: 'Paramus',
    addressRegion: 'NJ',
    postalCode: '07652',
    addressCountry: 'US',
  },
  geo: {
    latitude: '40.9448',
    longitude: '-74.0726',
  },
  priceRange: '$$',
  openingHours: 'Mo-Su 00:00-24:00',
  sameAs: [
    'https://www.facebook.com/njselectdeals',
    'https://www.instagram.com/njselectdeals',
  ],
};

/**
 * Generate standard OpenGraph and Twitter metadata
 */
export function generateSEOMetadata({
  title,
  description,
  path = '',
  image,
  type = 'website',
  publishedTime,
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  noIndex?: boolean;
}) {
  const canonicalUrl = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const ogImage = image || `${SITE_URL}/og-image.jpg`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large' as const,
            'max-snippet': -1,
          },
        },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: STORE_INFO.name,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type,
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [ogImage],
      creator: '@njselectdeals',
    },
  };
}

/**
 * Generate Schema.org Organization structured data
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: STORE_INFO.name,
    legalName: STORE_INFO.legalName,
    url: STORE_INFO.url,
    logo: STORE_INFO.logo,
    description: STORE_INFO.description,
    telephone: STORE_INFO.telephone,
    email: STORE_INFO.email,
    priceRange: STORE_INFO.priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: STORE_INFO.address.streetAddress,
      addressLocality: STORE_INFO.address.addressLocality,
      addressRegion: STORE_INFO.address.addressRegion,
      postalCode: STORE_INFO.address.postalCode,
      addressCountry: STORE_INFO.address.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: STORE_INFO.geo.latitude,
      longitude: STORE_INFO.geo.longitude,
    },
    sameAs: STORE_INFO.sameAs,
  };
}

/**
 * Generate Schema.org Product structured data without fake reviews
 */
export function generateProductSchema(product: {
  id: string;
  name: string;
  slug: string;
  description: string;
  sku: string;
  brand?: string | null;
  price: number;
  salePrice?: number | null;
  inventory: number;
  rating?: number;
  reviewCount?: number;
  images?: { url: string }[];
  category?: { name: string } | null;
}) {
  const primaryImage =
    product.images && product.images.length > 0
      ? product.images[0].url
      : `${SITE_URL}/og-image.jpg`;

  const allImages =
    product.images && product.images.length > 0
      ? product.images.map((i) => i.url)
      : [primaryImage];

  const effectivePrice = product.salePrice && product.salePrice < product.price
    ? product.salePrice
    : product.price;

  const productUrl = `${SITE_URL}/products/${product.slug}`;

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: allImages,
    description: product.description,
    sku: product.sku,
    mpn: product.sku,
    url: productUrl,
    brand: {
      '@type': 'Brand',
      name: product.brand || STORE_INFO.name,
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'USD',
      price: effectivePrice.toFixed(2),
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability:
        product.inventory > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: STORE_INFO.name,
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: effectivePrice >= 50 ? '0.00' : '4.99',
          currency: 'USD',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'US',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 1,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 2,
            maxValue: 5,
            unitCode: 'DAY',
          },
        },
      },
    },
  };

  if (product.category) {
    schema.category = product.category.name;
  }

  // Only include aggregateRating if legitimate customer reviews exist (Never fake reviews)
  if (product.reviewCount && product.reviewCount > 0 && product.rating && product.rating > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating.toFixed(1),
      reviewCount: product.reviewCount,
      bestRating: '5',
      worstRating: '1',
    };
  }

  return schema;
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}
