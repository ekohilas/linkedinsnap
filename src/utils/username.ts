const PROFILE_PATH = /(?:^|\/)in\/([^/?#\s]+)/i;

/**
 * Pulls the profile name out of whatever was typed or pasted into the box.
 * Accepts a full LinkedIn profile URL (with or without scheme, subdomain,
 * trailing slash or query string) as well as a bare username.
 */
export function extractUsername(value: string): string {
  const trimmed = value.trim().replace(/^#/, '');
  const match = trimmed.match(PROFILE_PATH);
  const username = match ? match[1] : trimmed;

  try {
    return decodeURIComponent(username);
  } catch {
    return username;
  }
}
