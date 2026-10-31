// Supported social media platforms. Profile links come only from the admin panel; none are preset.
export const SOCIAL_PLATFORMS = Object.freeze([
  { id: 'facebook', name: 'Facebook', hosts: /(^|\.)(facebook\.com|fb\.com)$/ },
  { id: 'instagram', name: 'Instagram', hosts: /(^|\.)instagram\.com$/ },
  { id: 'youtube', name: 'YouTube', hosts: /(^|\.)(youtube\.com|youtu\.be)$/ },
  { id: 'linkedin', name: 'LinkedIn', hosts: /(^|\.)linkedin\.com$/ },
])

/** True when `url` is an https:// link on the platform's own website. */
export function isSocialUrl(platformId, url) {
  const platform = SOCIAL_PLATFORMS.find((p) => p.id === platformId)
  if (!platform || !url) return false
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && platform.hosts.test(u.hostname.toLowerCase())
  } catch {
    return false
  }
}

/** Enabled links with a valid URL, in the standard platform order. */
export function visibleSocialLinks(links = []) {
  return SOCIAL_PLATFORMS.flatMap((p) => {
    const link = links.find((l) => String(l.platform).toLowerCase() === p.id)
    return link && link.enabled !== false && isSocialUrl(p.id, link.url) ? [{ platform: p.id, name: p.name, url: link.url }] : []
  })
}
