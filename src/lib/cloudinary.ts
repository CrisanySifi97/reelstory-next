// Injects Cloudinary delivery transformations (auto format/quality + resize) into a
// stored image URL, so the browser downloads a small WebP/AVIF instead of the full upload.
// Non-Cloudinary URLs are returned unchanged.
export function cld(url: string | undefined, width: number): string | undefined {
  if (!url) return url
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`)
}
