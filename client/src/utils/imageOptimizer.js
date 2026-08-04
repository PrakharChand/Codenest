/**
 * client/src/utils/imageOptimizer.js
 *
 * Appends Cloudinary transformation parameters for bandwidth & image optimization.
 *  - avatar / thumb: /w_80,h_80,c_fill,f_webp,q_auto/
 *  - large / profile: /w_400,h_400,c_fill,f_webp,q_auto/
 */

export function optimizeCloudinaryUrl(url, size = 'avatar') {
  if (!url || typeof url !== 'string') return url;

  // Only apply transformations to Cloudinary URLs
  if (!url.includes('cloudinary.com') && !url.includes('/upload/')) {
    return url;
  }

  // Determine transformation parameters based on size preset
  const params = size === 'large' || size === 'profile' || size === '400'
    ? 'w_400,h_400,c_fill,f_webp,q_auto'
    : 'w_80,h_80,c_fill,f_webp,q_auto';

  // Check if transformation is already applied
  if (url.includes('/w_80,') || url.includes('/w_400,')) {
    return url;
  }

  // Insert parameters after '/upload/'
  return url.replace('/upload/', `/upload/${params}/`);
}
