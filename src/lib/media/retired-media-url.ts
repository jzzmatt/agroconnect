const RETIRED_MEDIA_HOSTS = ["imagekit.io", "b-cdn.net", "bunnycdn.com", "mediadelivery.net"];

/** True when a stored URL still points at a media host this app no longer uses. */
export function isRetiredMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return RETIRED_MEDIA_HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
  } catch {
    return /imagekit\.io|b-cdn\.net|bunnycdn|mediadelivery\.net/i.test(url);
  }
}

/** Drops a stored URL when it still points at a retired media host. */
export function visibleMediaUrl(url: string | null | undefined): string | null {
  if (!url || isRetiredMediaUrl(url)) return null;
  return url;
}
