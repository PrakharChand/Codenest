/**
 * client/src/components/atoms/SEO.jsx
 *
 * Reusable SEO component built on react-helmet-async.
 * Injects:
 *  - <title>
 *  - <meta name="description">
 *  - <link rel="canonical">
 *  - Open Graph tags (og:site_name, og:type, og:title, og:description, og:url, og:image)
 *  - Twitter tags (twitter:card, twitter:title, twitter:description, twitter:image)
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'CodeNest';
const DEFAULT_TITLE = 'CodeNest — The Dual-Identity Platform for Developers';
const DEFAULT_DESCRIPTION = 'Share tech insights publicly on Nest Feed or get 100% anonymous, bias-free code reviews on Nest Shadow.';
const DEFAULT_IMAGE = '/logo.png';

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_IMAGE,
  noIndex = false,
}) {
  const location = useLocation();

  // Dynamic document title formatting
  const pageTitle = title
    ? `${title} | ${SITE_NAME}`
    : DEFAULT_TITLE;

  // Auto-detect base origin & full canonical URL
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://codenest.dev';

  const canonicalUrl = canonical || `${origin}${location.pathname}`;
  const imageUrl = ogImage.startsWith('http') ? ogImage : `${origin}${ogImage}`;

  return (
    <Helmet>
      {/* Document Title & Description */}
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
}
