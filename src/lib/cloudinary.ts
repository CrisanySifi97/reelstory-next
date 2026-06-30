export function cld(url: string | undefined, width: number): string | undefined {
  if (!url) return url
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,w_${width}/`)
  }
  if (url.includes('.b-cdn.net')) {
    return `${url}?width=${width}&optimizer=image`
  }
  return url
}

export function hdUrl(url?: string): string {
  if (!url) return ''
  if (url.includes('res.cloudinary.com')) {
    return url.replace('/upload/', '/upload/q_auto:good,f_auto/')
  }
  return url
}
