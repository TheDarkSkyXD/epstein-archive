import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  url?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title = 'Epstein Files Archive',
  description = 'Comprehensive archive of the Epstein files, documents, and photos.',
  image = 'https://epstein.academy/og-image.png',
  type = 'website',
  url,
}) => {
  const siteTitle = 'Epstein Files Archive';
  const fullTitle = title === siteTitle ? siteTitle : `${title} | ${siteTitle}`;
  const currentUrl = url || window.location.href;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteTitle} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};
